'use server'

import { auth } from "@/auth";
import { userRepository } from "@/lib/repositories/auth-repository";
import { projectRepository, deploymentRepository } from "@/lib/repositories/project-repository";
import { redirect } from "next/navigation";

export interface AuditStats {
  totalCredits: number;
  totalProjects: number;
  totalDeployments: number;
  totalCalls: number;
}

export interface ProjectAuditData {
  id: string;
  name: string;
  callCount: number;
  lastCalled: Date | null;
  createdAt: Date;
  isActive: boolean;
}

export async function getAuditData() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const userId = session.user.id;

  // Fetch User Credits
  const user = await userRepository.findById(userId);

  // Fetch All Projects with Deployments for the User
  const projects = await projectRepository.findByUserId(userId);
  
  // Aggregate Data
  let totalCalls = 0;
  let totalDeployments = 0;
  const projectStats: ProjectAuditData[] = [];

  for (const project of projects) {
    const deployments = await deploymentRepository.findByProjectId(project.id);
    
    let projectCallCount = 0;
    let projectLastCalled: Date | null = null;
    let hasActiveDeployment = false;

    deployments.forEach((deployment) => {
      totalDeployments++;
      totalCalls += deployment.callCount;
      projectCallCount += deployment.callCount;

      if (deployment.isActive) hasActiveDeployment = true;

      if (deployment.lastCalled) {
        if (!projectLastCalled || new Date(deployment.lastCalled) > new Date(projectLastCalled)) {
          projectLastCalled = deployment.lastCalled;
        }
      }
    });

    projectStats.push({
      id: project.id,
      name: project.name,
      callCount: projectCallCount,
      lastCalled: projectLastCalled,
      createdAt: project.createdAt,
      isActive: hasActiveDeployment,
    });
  }

  // Sort Projects by Call Count (Descending)
  projectStats.sort((a, b) => b.callCount - a.callCount);

  const stats: AuditStats = {
    totalCredits: user?.credits || 0,
    totalProjects: projects.length,
    totalDeployments,
    totalCalls,
  };

  return {
    stats,
    projects: projectStats,
  };
}