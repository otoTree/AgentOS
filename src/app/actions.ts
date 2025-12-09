'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { generateCode } from "@/lib/ai/ai";
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";
import { processExecutionResult } from "@/lib/execution/execution-helper";
import { ProjectStorage } from "@/lib/storage/project-storage";
import { StorageHelper } from "@/lib/storage/storage-helper";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createKnowledgeBaseCollection, deleteKnowledgeBaseCollection } from "@/lib/integrations/knowledge-base";
import { UserConfig, updateUserConfig, getUserConfig } from "@/lib/infra/config";
import { systemConfig } from "@/lib/infra/config";

// --- Project Actions ---

export async function createProject(name: string, description?: string) {
  console.log("[createProject] Starting creation for:", name);
  const session = await auth();
  if (!session?.user?.id) {
    console.error("[createProject] Not authenticated");
    throw new Error("Not authenticated");
  }

  // Verify user exists in database (handle stale sessions)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/api/auth/signin");
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId: session.user.id,
    },
  });

  // Create default tool
  await createTool(project.id, "Main Tool");

  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}

export async function getProjects() {
  const session = await auth();
  if (!session?.user?.id) {
      return [];
  }

  return prisma.project.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      deployments: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  });
}

export async function getProject(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }
  
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
          tools: {
            orderBy: { createdAt: 'asc' },
            include: {
                deployments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                // Include messages specific to this tool
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
          },
          user: {
              select: {
                  name: true,
                  image: true,
              }
          }
      }
    });

    if (!project) return null;

    // Fetch code for each tool from S3 if needed
    for (const tool of project.tools) {
        if (tool.storageKey) {
            const s3Code = await ProjectStorage.getCode(tool.storageKey);
            if (s3Code !== null) {
                tool.code = s3Code;
            }
        }
    }

    return project;
}

// --- Tool Actions ---

export async function createTool(projectId: string, name: string, description?: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const initialCode = `def main():\n    print("Hello from ${name}")`;
    
    const tool = await prisma.tool.create({
        data: {
            name,
            description,
            projectId,
            code: initialCode,
            inputs: []
        }
    });

    const storageKey = ProjectStorage.getToolKey(session.user.id, projectId, tool.id);
    await ProjectStorage.saveCode(storageKey, initialCode);

    await prisma.tool.update({
        where: { id: tool.id },
        data: { storageKey }
    });

    revalidatePath(`/project/${projectId}`);
    return tool;
}

export async function updateTool(toolId: string, name: string, description?: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { project: true }
    });

    if (!tool || tool.project.userId !== session.user.id) throw new Error("Tool not found or unauthorized");

    const updatedTool = await prisma.tool.update({
        where: { id: toolId },
        data: { name, description }
    });

    revalidatePath(`/project/${tool.projectId}`);
    return updatedTool;
}

export async function updateToolCode(toolId: string, code: string, inputs?: any[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: { project: true }
  });

  if (!tool || tool.project.userId !== session.user.id) throw new Error("Tool not found or unauthorized");

  let storageKey = tool.storageKey;
  if (!storageKey) {
      storageKey = ProjectStorage.getToolKey(session.user.id, tool.projectId, toolId);
  }
  await ProjectStorage.saveCode(storageKey, code);

  const data: any = {
      code,
      storageKey
  };
  
  if (inputs !== undefined) {
      data.inputs = inputs;
  }

  const updatedTool = await prisma.tool.update({
    where: { id: toolId },
    data,
  });

  revalidatePath(`/project/${tool.projectId}`);
  return updatedTool;
}

export async function deleteTool(toolId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: {
            project: true,
            deployments: true
        }
    });

    if (!tool || tool.project.userId !== session.user.id) throw new Error("Tool not found or unauthorized");

    // Delete any KB collections associated with deployments
    for (const deployment of tool.deployments) {
        if (deployment.knowledgeBaseCollectionId) {
            await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
        }
    }

    // Check if it's the last tool? Maybe not enforce strictly but good UX.
    // For now just delete.

    await prisma.tool.delete({ where: { id: toolId } });
    revalidatePath(`/project/${tool.projectId}`);
}

export async function updateProjectMetadata(id: string, name: string, description?: string, avatar?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const project = await prisma.project.update({
    where: {
      id,
      userId: session.user.id,
    },
    data: {
      name,
      description,
      avatar,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/project/${id}`);
  return project;
}

export async function deleteProject(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }
  
    // Clean up Knowledge Base Collections
    const project = await prisma.project.findUnique({
        where: { id, userId: session.user.id },
        include: {
            deployments: true
        }
    });

    if (project) {
        for (const deployment of project.deployments) {
            if (deployment.knowledgeBaseCollectionId) {
                await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
            }
        }

        await prisma.project.delete({
            where: {
                id,
                userId: session.user.id,
            },
        });
    }
  
    revalidatePath("/dashboard");
}

// --- AI Actions ---


export async function getUserOpenAIConfig() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openaiApiKey: true, openaiBaseUrl: true, openaiModel: true },
  });

  return user;
}

export async function generateToolCode(
    toolId: string,
    prompt: string,
    currentCode: string,
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) throw new Error("Tool not found");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { openaiApiKey: true, openaiBaseUrl: true, openaiModel: true },
    });

    // 1. Save user message linked to Tool
    await prisma.projectMessage.create({
        data: {
            projectId: tool.projectId,
            toolId: tool.id,
            role: 'user',
            content: prompt,
        }
    });

    // 2. Fetch recent history for THIS TOOL
    const dbMessages = await prisma.projectMessage.findMany({
        where: { toolId: tool.id },
        orderBy: { createdAt: 'asc' },
        take: 20
    });

    const history = dbMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
    }));

    // 3. Call AI
    const result = await generateCode(prompt, currentCode, history, {
      apiKey: user?.openaiApiKey,
      baseUrl: user?.openaiBaseUrl,
      model: user?.openaiModel,
    });

    // 4. Save assistant response linked to Tool
    if (result.message) {
        await prisma.projectMessage.create({
            data: {
                projectId: tool.projectId,
                toolId: tool.id,
                role: 'assistant',
                content: result.message,
            }
        });
    }

    if (result.updatedCode) {
        console.log("[generateToolCode] Auto-saving generated code");
        await updateToolCode(toolId, result.updatedCode, result.inputs);
    }
    
    return result;
}

// --- Execution & Deployment Actions ---

export async function runProjectCode(code: string, inputs: Record<string, any> = {}) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }
    
    // Get or create API Token for the user to inject into the tool
    let apiToken = await prisma.apiToken.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });

    if (!apiToken) {
        // Auto-generate a token for usage
        const tokenString = 'atk_' + crypto.randomUUID().replace(/-/g, '');
        apiToken = await prisma.apiToken.create({
            data: {
                name: "Default Editor Token",
                token: tokenString,
                userId: session.user.id
            }
        });
    }

    // Ensure we have a valid base URL
    // Priority: API_URL (explicit config) > NEXTAUTH_URL (auth config) > localhost
    let baseUrl = process.env.API_URL || process.env.NEXTAUTH_URL;
    if (!baseUrl) {
        baseUrl = 'http://localhost:3000';
    }
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    const fileUploadUrl = baseUrl + '/api';

    const wrappedCode = wrapCode(code, inputs);

    // Execute code in sandbox
    const result = await executeCode(wrappedCode, 50000, apiToken.token);
    
    // Process result for potential file outputs
    return await processExecutionResult(result, session.user.id);
}

export async function deployTool(toolId: string, accessType: 'PUBLIC' | 'PRIVATE', category: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { project: true }
    });

    if (!tool || tool.project.userId !== session.user.id) throw new Error("Tool not found or unauthorized");

    // Update Project Category (Projects hold the category for marketplace organization, or should tools?)
    // The requirement says "one project multiple tools". Marketplace shows Projects?
    // User decided: "Project as release unit... click detail to list all tools".
    // So category belongs to Project.
    await prisma.project.update({
        where: { id: tool.projectId },
        data: { category }
    });

    // Check for existing deployment of the same type
    const existingDeployment = await prisma.deployment.findFirst({
        where: {
            toolId: tool.id,
            accessType: accessType
        }
    });

    let knowledgeBaseCollectionId: string | null = null;
    if (accessType === 'PUBLIC') {
        // Clean up old KB collection if exists (for update scenario)
        if (existingDeployment?.knowledgeBaseCollectionId) {
            try {
                await deleteKnowledgeBaseCollection(existingDeployment.knowledgeBaseCollectionId);
            } catch (error) {
                console.error("Failed to delete old knowledge base collection:", error);
                // Continue even if delete fails, not critical
            }
        }

        knowledgeBaseCollectionId = await createKnowledgeBaseCollection(
            tool.project.name,
            tool.name,
            tool.description,
            tool.id
        );
    }

    let deployment;
    if (existingDeployment) {
        // Update existing deployment
        deployment = await prisma.deployment.update({
            where: { id: existingDeployment.id },
            data: {
                snapshotCode: tool.code,
                inputs: tool.inputs as any,
                isActive: true, // Reactivate if it was disabled
                knowledgeBaseCollectionId,
            }
        });
    } else {
        // Create new deployment
        deployment = await prisma.deployment.create({
            data: {
                projectId: tool.projectId,
                toolId: tool.id,
                snapshotCode: tool.code,
                inputs: tool.inputs as any,
                accessType,
                knowledgeBaseCollectionId,
            }
        });
    }

    const deploymentKey = ProjectStorage.getDeploymentKey(session.user.id, tool.projectId, deployment.id);

    if (tool.storageKey) {
        await ProjectStorage.copySnapshot(tool.storageKey, deploymentKey);
    } else {
        await ProjectStorage.saveCode(deploymentKey, tool.code);
    }

    await prisma.deployment.update({
        where: { id: deployment.id },
        data: { storageKey: deploymentKey }
    });

    revalidatePath(`/project/${tool.projectId}`);
    return deployment;
}

export async function getMarketplaceProjects(
    category?: string,
    sort: 'latest' | 'popular' = 'latest'
) {
    const where: any = {
        deployments: {
            some: {
                isActive: true,
                accessType: 'PUBLIC'
            }
        }
    };

    if (category && category !== 'All') {
        where.category = category;
    }

    // We need a complex query to sort by popularity (sum of call counts or max of call counts?)
    // For simplicity in this V1, let's fetch and sort in memory or use a raw query if performance matters.
    // Given Prisma limitations on relation aggregates sorting in simple findMany without experimental features...
    // Let's fetch the top-level projects and their *active public deployment stats*.
    
    const projects = await prisma.project.findMany({
        where,
        include: {
            deployments: {
                where: {
                    isActive: true,
                    accessType: 'PUBLIC'
                },
                select: {
                    callCount: true,
                    createdAt: true,
                    id: true
                },
                orderBy: {
                    createdAt: 'desc' // Get the latest deployment for stats
                },
                take: 1
            },
            user: {
                select: {
                    name: true,
                    image: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc' // Default for now
        }
    });

    // Process for sorting
    const processed = projects.map(p => {
        const deployment = p.deployments[0];
        return {
            ...p,
            activeDeploymentId: deployment?.id,
            callCount: deployment?.callCount || 0,
            lastDeployedAt: deployment?.createdAt || p.updatedAt
        };
    });

    if (sort === 'popular') {
        processed.sort((a, b) => b.callCount - a.callCount);
    } else {
        // Latest deployed
        processed.sort((a, b) => new Date(b.lastDeployedAt).getTime() - new Date(a.lastDeployedAt).getTime());
    }

    return processed;
}

export async function getPublicProject(id: string) {
    // Allow access if user is owner OR if there is an active public deployment
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch ALL active public deployments (so we can list all tools)
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            deployments: {
                where: {
                    isActive: true,
                    accessType: 'PUBLIC'
                },
                include: {
                    tool: {
                        select: {
                            name: true,
                            description: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            },
            user: {
                select: {
                    name: true,
                    image: true
                }
            }
        }
    });

    if (!project) return null;

    // If owner, return full access but keep the deployment list structure for the marketplace view
    if (userId && project.userId === userId) {
        // We return the project as fetched here (with all public deployments)
        // But we might want private ones too?
        // The marketplace view expects "deployments".
        // Let's return what we found here, but maybe flag isOwner.
        return {
             ...project,
             isOwner: true
        };
    }

    // If not owner, check for public deployment
    if (project.deployments.length > 0) {
        return {
            ...project,
            messages: [], // Public view doesn't show chat history
            isOwner: false,
        };
    }

    return null;
}

export async function toggleDeploymentStatus(deploymentId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Verify ownership through project
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  });

  if (!deployment || deployment.project.userId !== session.user.id) {
    throw new Error("Deployment not found or unauthorized");
  }

  const updatedDeployment = await prisma.deployment.update({
    where: { id: deploymentId },
    data: { isActive },
  });

  revalidatePath(`/project/${deployment.projectId}`);
  return updatedDeployment;
}

export async function deleteDeployment(deploymentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Verify ownership through project
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  });

  if (!deployment || deployment.project.userId !== session.user.id) {
    throw new Error("Deployment not found or unauthorized");
  }

  // Delete from Knowledge Base if exists
  if (deployment.knowledgeBaseCollectionId) {
      await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
  }

  await prisma.deployment.delete({
    where: { id: deploymentId },
  });

  revalidatePath(`/project/${deployment.projectId}`);
}

// --- User Profile & API Token Actions ---

export async function getApiTokens() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    return prisma.apiToken.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });
}

export async function generateApiToken(name: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const token = `sk-${crypto.randomUUID()}`;

    const apiToken = await prisma.apiToken.create({
        data: {
            name,
            token,
            userId: session.user.id
        }
    });

    revalidatePath("/dashboard/profile");
    return apiToken;
}

export async function deleteApiToken(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    await prisma.apiToken.delete({
        where: {
            id,
            userId: session.user.id
        }
    });

    revalidatePath("/dashboard/profile");
}

export async function getUserCredits() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true }
    });

    return user?.credits || 0;
}

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            apiTokens: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) throw new Error("User not found");

    const storageStats = await StorageHelper.getStorageStats(user.id);

    return {
        credits: user.credits,
        tokens: user.apiTokens,
        name: user.name,
        image: user.image,
        openaiApiKey: user.openaiApiKey,
        openaiBaseUrl: user.openaiBaseUrl,
        openaiModel: user.openaiModel,
        email: user.email,
        username: user.username,
        storage: storageStats
    };
}

export async function addCredits(amount: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // In a real app, this would be connected to a payment gateway.
    // Here we just simulate adding credits.
    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            credits: { increment: amount }
        }
    });

    revalidatePath("/dashboard/profile");
}

// --- Comment Actions ---

export async function addComment(projectId: string, content: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    if (!content.trim()) {
        throw new Error("Comment cannot be empty");
    }

    const comment = await prisma.comment.create({
        data: {
            projectId,
            userId: session.user.id,
            content: content.trim()
        },
        include: {
            user: {
                select: {
                    name: true,
                    image: true
                }
            }
        }
    });

    revalidatePath(`/marketplace/project/${projectId}`);
    return comment;
}

export async function getProjectComments(projectId: string) {
    // Public access allowed
    return prisma.comment.findMany({
        where: { projectId },
        include: {
            user: {
                select: {
                    name: true,
                    image: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}
export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const userId = session.user.id;

  const [user, projectCount, activeDeployments, totalCalls] = await Promise.all([
      prisma.user.findUnique({ 
          where: { id: userId },
          select: { credits: true }
      }),
      prisma.project.count({ where: { userId } }),
      prisma.deployment.count({ 
          where: { 
              project: { userId },
              isActive: true 
          } 
      }),
      prisma.deployment.aggregate({
          where: { project: { userId } },
          _sum: { callCount: true }
      })
  ]);

  return {
      credits: user?.credits || 0,
      projectCount,
      activeDeployments,
      totalCalls: totalCalls._sum.callCount || 0
  };
}

export async function getRecentActivity() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const projects = await prisma.project.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
            id: true,
            name: true,
            updatedAt: true,
            avatar: true,
            deployments: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    id: true,
                    isActive: true,
                    createdAt: true
                }
            }
        }
    });
    
    return projects;
}

// --- Email Actions ---

export async function getEmails() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const emails = await prisma.email.findMany({
        where: { userId: session.user.id },
        orderBy: { receivedAt: 'desc' }
    });

    return emails;
}

export async function getEmail(id: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const email = await prisma.email.findFirst({
        where: {
            id,
            userId: session.user.id
        }
    });

    if (email && !email.isRead) {
        // Mark as read
        await prisma.email.update({
            where: { id: email.id },
            data: { isRead: true }
        });
    }

    return email;
}