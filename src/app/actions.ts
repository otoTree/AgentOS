'use server'

import { auth } from "@/auth";
import { projectRepository, deploymentRepository } from "@/lib/repositories/project-repository";
import { toolRepository } from "@/lib/repositories/tool-repository";
import { projectMessageRepository } from "@/lib/repositories/project-message-repository";
import { userRepository } from "@/lib/repositories/auth-repository";
import { fileRepository } from "@/lib/repositories/file-repository";
import { emailRepository } from "@/lib/repositories/email-repository";
import { apiTokenRepository } from "@/lib/repositories/api-token-repository";
import { commentRepository } from "@/lib/repositories/comment-repository";
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
  const user = await userRepository.findById(session.user.id);
  if (!user) {
    redirect("/api/auth/signin");
  }

  const project = await projectRepository.create({
    name,
    description,
    userId: session.user.id,
    category: 'Tools'
  });

  // Create default tool
  await createTool(project.id, "Main Tool");

  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}

export async function createProjectEmbedded(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const project = await projectRepository.create({
    name,
    description,
    userId: session.user.id,
    category: 'Tools'
  });

  await createTool(project.id, "Main Tool");

  revalidatePath("/dashboard");
  return project;
}

export async function getProjects() {
  const session = await auth();
  if (!session?.user?.id) {
      return [];
  }

  const projects = await projectRepository.findByUserId(session.user.id);
  
  // Sort projects by updatedAt desc (Redis zrevrange returns sorted but let's ensure)
  // And fetch latest deployment for each
  const result = await Promise.all(projects.map(async (p) => {
      const deployments = await deploymentRepository.findByProjectId(p.id);
      // deployments from findByProjectId are already sorted by createdAt desc
      const latest = deployments.length > 0 ? [deployments[0]] : [];
      return { ...p, deployments: latest };
  }));

  return result;
}

export async function getProject(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }
  
    const project = await projectRepository.findById(id);
    if (!project || project.userId !== session.user.id) return null;

    const tools = await toolRepository.findByProjectId(project.id);
    const allDeployments = await deploymentRepository.findByProjectId(project.id);

    // Fetch code for each tool from S3 if needed
    // And attach deployments/messages
    const toolsWithData = await Promise.all(tools.map(async (tool) => {
        if (tool.storageKey) {
            const s3Code = await ProjectStorage.getCode(tool.storageKey);
            if (s3Code !== null) {
                tool.code = s3Code;
            }
        }

        // Filter deployments for this tool
        const toolDeployments = allDeployments.filter(d => d.toolId === tool.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);

        const messages = await projectMessageRepository.findByToolId(tool.id);

        return {
            ...tool,
            deployments: toolDeployments,
            messages: messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        };
    }));

    // Sort tools
    toolsWithData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const user = await userRepository.findById(project.userId);

    return {
        ...project,
        tools: toolsWithData,
        user: user ? { name: user.name, image: user.image } : null
    };
}

// --- Tool Actions ---

export async function createTool(projectId: string, name: string, description?: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const initialCode = `def main():\n    print("Hello from ${name}")`;
    
    const tool = await toolRepository.create({
        name,
        description,
        projectId,
        code: initialCode,
        inputs: []
    });

    const storageKey = ProjectStorage.getToolKey(session.user.id, projectId, tool.id);
    await ProjectStorage.saveCode(storageKey, initialCode);

    await toolRepository.update(tool.id, { storageKey });

    revalidatePath(`/project/${projectId}`);
    return tool;
}

export async function updateTool(toolId: string, name: string, description?: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await toolRepository.findById(toolId);
    if (!tool) throw new Error("Tool not found");

    const project = await projectRepository.findById(tool.projectId);
    if (!project || project.userId !== session.user.id) throw new Error("Unauthorized");

    const updatedTool = await toolRepository.update(toolId, { name, description });

    revalidatePath(`/project/${tool.projectId}`);
    return updatedTool;
}

export async function updateToolCode(toolId: string, code: string, inputs?: any[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const tool = await toolRepository.findById(toolId);
  if (!tool) throw new Error("Tool not found");

  const project = await projectRepository.findById(tool.projectId);
  if (!project || project.userId !== session.user.id) throw new Error("Unauthorized");

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

  const updatedTool = await toolRepository.update(toolId, data);

  revalidatePath(`/project/${tool.projectId}`);
  return updatedTool;
}

export async function deleteTool(toolId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await toolRepository.findById(toolId);
    if (!tool) throw new Error("Tool not found");

    const project = await projectRepository.findById(tool.projectId);
    if (!project || project.userId !== session.user.id) throw new Error("Unauthorized");

    const deployments = await deploymentRepository.findByProjectId(project.id);
    const toolDeployments = deployments.filter(d => d.toolId === toolId);

    // Delete any KB collections associated with deployments
    for (const deployment of toolDeployments) {
        if (deployment.knowledgeBaseCollectionId) {
            await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
        }
    }

    await toolRepository.delete(toolId);
    revalidatePath(`/project/${tool.projectId}`);
}

export async function updateProjectMetadata(id: string, name: string, description?: string, avatar?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const project = await projectRepository.update(id, {
      name,
      description,
      avatar
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
    const project = await projectRepository.findById(id);

    if (project && project.userId === session.user.id) {
        const deployments = await deploymentRepository.findByProjectId(project.id);
        for (const deployment of deployments) {
            if (deployment.knowledgeBaseCollectionId) {
                await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
            }
            await deploymentRepository.delete(deployment.id);
        }

        const tools = await toolRepository.findByProjectId(project.id);
        for (const tool of tools) {
            const messages = await projectMessageRepository.findByToolId(tool.id);
            for (const msg of messages) {
                await projectMessageRepository.delete(msg.id);
            }
            await toolRepository.delete(tool.id);
        }

        await projectRepository.delete(id);
    }
  
    revalidatePath("/dashboard");
}

// --- AI Actions ---

export async function generateToolCode(
    toolId: string,
    prompt: string,
    currentCode: string,
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const tool = await toolRepository.findById(toolId);
    if (!tool) throw new Error("Tool not found");

    // 1. Save user message linked to Tool
    await projectMessageRepository.create({
        projectId: tool.projectId,
        toolId: tool.id,
        role: 'user',
        content: prompt,
    });

    // 2. Fetch recent history for THIS TOOL
    const dbMessages = await projectMessageRepository.findByToolId(tool.id);
    const sortedMessages = dbMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-20);

    const history = sortedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
    }));

    // 3. Call AI
    const result = await generateCode(prompt, currentCode, history);

    // 4. Save assistant response linked to Tool
    if (result.message) {
        await projectMessageRepository.create({
            projectId: tool.projectId,
            toolId: tool.id,
            role: 'assistant',
            content: result.message,
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
    const tokens = await apiTokenRepository.findByUserId(session.user.id);
    let apiToken = tokens.length > 0 ? tokens[0] : null;

    if (!apiToken) {
        // Auto-generate a token for usage
        const tokenString = 'atk_' + crypto.randomUUID().replace(/-/g, '');
        apiToken = await apiTokenRepository.create({
            name: "Default Editor Token",
            token: tokenString,
            userId: session.user.id
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

    const tool = await toolRepository.findById(toolId);
    if (!tool) throw new Error("Tool not found");
    
    const project = await projectRepository.findById(tool.projectId);
    if (!project || project.userId !== session.user.id) throw new Error("Unauthorized");

    // Update Project Category
    await projectRepository.update(tool.projectId, { category });

    // Check for existing deployment of the same type
    const deployments = await deploymentRepository.findByProjectId(tool.projectId);
    const existingDeployment = deployments.find(d => d.toolId === tool.id && d.accessType === accessType);

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
            project.name,
            tool.name,
            tool.description || "",
            tool.id
        );
    }

    let deployment;
    if (existingDeployment) {
        // Update existing deployment
        deployment = await deploymentRepository.update(existingDeployment.id, {
            snapshotCode: tool.code,
            inputs: tool.inputs as any,
            isActive: true, // Reactivate if it was disabled
            knowledgeBaseCollectionId: knowledgeBaseCollectionId || undefined,
        });
    } else {
        // Create new deployment
        deployment = await deploymentRepository.create({
            projectId: tool.projectId,
            toolId: tool.id,
            snapshotCode: tool.code,
            inputs: tool.inputs as any,
            accessType,
            isActive: true,
            callCount: 0,
            knowledgeBaseCollectionId: knowledgeBaseCollectionId || undefined,
        });
    }

    const deploymentKey = ProjectStorage.getDeploymentKey(session.user.id, tool.projectId, deployment.id);

    if (tool.storageKey) {
        await ProjectStorage.copySnapshot(tool.storageKey, deploymentKey);
    } else {
        await ProjectStorage.saveCode(deploymentKey, tool.code);
    }

    await deploymentRepository.update(deployment.id, { storageKey: deploymentKey });

    revalidatePath(`/project/${tool.projectId}`);
    return deployment;
}

export async function getMarketplaceProjects(
    category?: string,
    sort: 'latest' | 'popular' = 'latest'
) {
    // 1. Get all public deployments
    const publicDeployments = await deploymentRepository.findPublic();
    
    // 2. Aggregate by project
    // We need to fetch projects associated with these deployments
    const projectIds = Array.from(new Set(publicDeployments.map(d => d.projectId)));
    
    // 3. Fetch projects
    const projects: any[] = [];
    for (const pid of projectIds) {
        const project = await projectRepository.findById(pid);
        if (project) {
            // Filter by category if needed
            if (category && category !== 'All' && project.category !== category) {
                continue;
            }
            
            // Get user
            const user = await userRepository.findById(project.userId);
            
            // Get latest deployment stats for this project
            const projectDeployments = publicDeployments.filter(d => d.projectId === pid);
            const latestDeployment = projectDeployments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            
            if (latestDeployment) {
                projects.push({
                    ...project,
                    user: user ? { name: user.name, image: user.image } : null,
                    activeDeploymentId: latestDeployment.id,
                    callCount: latestDeployment.callCount,
                    lastDeployedAt: latestDeployment.createdAt
                });
            }
        }
    }

    // 4. Sort
    if (sort === 'popular') {
        projects.sort((a, b) => b.callCount - a.callCount);
    } else {
        // Latest deployed
        projects.sort((a, b) => new Date(b.lastDeployedAt).getTime() - new Date(a.lastDeployedAt).getTime());
    }

    return projects;
}

export async function getPublicProject(id: string) {
    // Allow access if user is owner OR if there is an active public deployment
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch ALL active public deployments (so we can list all tools)
    const project = await projectRepository.findById(id);
    if (!project) return null;

    const allDeployments = await deploymentRepository.findByProjectId(project.id);
    const activePublicDeployments = allDeployments.filter(d => d.isActive && d.accessType === 'PUBLIC')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // If owner, return full access but keep the deployment list structure for the marketplace view
    if (userId && project.userId === userId) {
        // We return the project as fetched here (with all public deployments)
        // But we might want private ones too?
        // The marketplace view expects "deployments".
        // Let's return what we found here, but maybe flag isOwner.
        
        // We need to construct the structure expected by the UI
        const tools = await toolRepository.findByProjectId(project.id);
        const deploymentsWithTools = await Promise.all(activePublicDeployments.map(async d => {
             const tool = tools.find(t => t.id === d.toolId);
             return {
                 ...d,
                 tool: tool ? { name: tool.name, description: tool.description } : null
             };
        }));

        return {
             ...project,
             deployments: deploymentsWithTools,
             user: await userRepository.findById(project.userId),
             isOwner: true
        };
    }

    // If not owner, check for public deployment
    if (activePublicDeployments.length > 0) {
        const tools = await toolRepository.findByProjectId(project.id);
        const deploymentsWithTools = await Promise.all(activePublicDeployments.map(async d => {
             const tool = tools.find(t => t.id === d.toolId);
             return {
                 ...d,
                 tool: tool ? { name: tool.name, description: tool.description } : null
             };
        }));

        return {
            ...project,
            deployments: deploymentsWithTools,
            user: await userRepository.findById(project.userId),
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
  const deployment = await deploymentRepository.findById(deploymentId);
  if (!deployment) throw new Error("Deployment not found");

  const project = await projectRepository.findById(deployment.projectId);
  if (!project || project.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  const updatedDeployment = await deploymentRepository.update(deploymentId, { isActive });

  revalidatePath(`/project/${deployment.projectId}`);
  return updatedDeployment;
}

export async function deleteDeployment(deploymentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Verify ownership through project
  const deployment = await deploymentRepository.findById(deploymentId);
  if (!deployment) throw new Error("Deployment not found");

  const project = await projectRepository.findById(deployment.projectId);
  if (!project || project.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  // Delete from Knowledge Base if exists
  if (deployment.knowledgeBaseCollectionId) {
      await deleteKnowledgeBaseCollection(deployment.knowledgeBaseCollectionId);
  }

  await deploymentRepository.delete(deploymentId);

  revalidatePath(`/project/${deployment.projectId}`);
}

// --- User Profile & API Token Actions ---

export async function getApiTokens() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    return apiTokenRepository.findByUserId(session.user.id);
}

export async function generateApiToken(name: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const token = `sk-${crypto.randomUUID()}`;

    const apiToken = await apiTokenRepository.create({
        name,
        token,
        userId: session.user.id
    });

    revalidatePath("/dashboard/profile");
    return apiToken;
}

export async function deleteApiToken(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // Verify ownership
    const token = await apiTokenRepository.findById(id);
    if (token && token.userId === session.user.id) {
        await apiTokenRepository.delete(id);
    }

    revalidatePath("/dashboard/profile");
}

export async function getUserCredits() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const user = await userRepository.findById(session.user.id);

    return user?.credits || 0;
}

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    const user = await userRepository.findById(session.user.id);
    if (!user) throw new Error("User not found");
    
    const tokens = await apiTokenRepository.findByUserId(user.id);

    const storageStats = await StorageHelper.getStorageStats(user.id);

    return {
        credits: user.credits,
        tokens: tokens,
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
    const user = await userRepository.findById(session.user.id);
    if (user) {
        await userRepository.update(user.id, { credits: user.credits + amount });
    }

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

    const comment = await commentRepository.create({
        projectId,
        userId: session.user.id,
        content: content.trim()
    });
    
    // Fetch user for return
    const user = await userRepository.findById(session.user.id);

    revalidatePath(`/marketplace/project/${projectId}`);
    return {
        ...comment,
        user: user ? { name: user.name, image: user.image } : null
    };
}

export async function getProjectComments(projectId: string) {
    // Public access allowed
    const comments = await commentRepository.findByProjectId(projectId);
    
    // Fetch users
    const commentsWithUser = await Promise.all(comments.map(async c => {
        const user = await userRepository.findById(c.userId);
        return {
            ...c,
            user: user ? { name: user.name, image: user.image } : null
        };
    }));
    
    return commentsWithUser.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const userId = session.user.id;

  const [user, projects, deployments] = await Promise.all([
      userRepository.findById(userId),
      projectRepository.findByUserId(userId),
      // We don't have a direct "count deployments by user" or "sum call count by user"
      // We need to iterate projects to find deployments
      // This is inefficient but Redis is fast.
      // Ideally we would maintain stats counters.
      Promise.resolve([]) // Placeholder for now, see below
  ]);

  let activeDeployments = 0;
  let totalCalls = 0;

  for (const project of projects) {
      const projectDeployments = await deploymentRepository.findByProjectId(project.id);
      for (const d of projectDeployments) {
          if (d.isActive) activeDeployments++;
          totalCalls += d.callCount;
      }
  }

  return {
      credits: user?.credits || 0,
      projectCount: projects.length,
      activeDeployments,
      totalCalls
  };
}

export async function getRecentActivity() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const projects = await projectRepository.findByUserId(session.user.id);
    const sortedProjects = projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
    
    const result = await Promise.all(sortedProjects.map(async p => {
        const deployments = await deploymentRepository.findByProjectId(p.id);
        const latest = deployments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        
        return {
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt,
            avatar: p.avatar,
            deployments: latest ? [{
                id: latest.id,
                isActive: latest.isActive,
                createdAt: latest.createdAt
            }] : []
        };
    }));
    
    return result;
}

// --- Email Actions ---

export async function getEmails() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return emailRepository.findByUserId(session.user.id);
}

export async function getEmail(id: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const email = await emailRepository.findById(id);

    if (email && email.userId === session.user.id) {
        if (!email.isRead) {
            // Mark as read
            await emailRepository.update(id, { isRead: true });
        }
        return email;
    }

    return null;
}