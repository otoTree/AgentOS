import { prisma } from "@/lib/infra/prisma";
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";
import { processExecutionResult } from "@/lib/execution/execution-helper";
import { ProjectStorage } from "@/lib/storage/project-storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  return handleRequest(params.deploymentId, request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  return handleRequest(params.deploymentId, request);
}

async function handleRequest(deploymentId: string, request: NextRequest) {
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true } // Need project to check owner
    });

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    if (!deployment.isActive) {
      return NextResponse.json({ error: "Deployment is inactive" }, { status: 410 });
    }

    // 1. Authenticate User via Bearer Token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Missing Bearer Token" }, { status: 401 });
    }

    // Find user by token
    const apiToken = await prisma.apiToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!apiToken) {
        return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
    }

    const user = apiToken.user;

    // 2. Authorization Check
    if (deployment.accessType === 'PRIVATE') {
        // For PRIVATE deployments, only the owner can access
        if (deployment.project.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden: You do not have access to this private deployment" }, { status: 403 });
        }
    }

    // 3. Billing Check
    if (user.credits <= 0) {
        return NextResponse.json({ error: "Payment Required: Insufficient credits" }, { status: 402 });
    }

    // 4. Deduct Credits & Update Stats
    // We do this transactionally or carefully. For now, parallel promises.
    await Promise.all([
        // Deduct credit
        prisma.user.update({
            where: { id: user.id },
            data: { credits: { decrement: 1 } }
        }),
        // Update Token usage
        prisma.apiToken.update({
            where: { id: apiToken.id },
            data: { lastUsed: new Date() }
        }),
        // Update Deployment stats
        prisma.deployment.update({
            where: { id: deploymentId },
            data: {
                callCount: { increment: 1 },
                lastCalled: new Date()
            }
        })
    ]);

    // 5. Parse inputs
    let inputs = {};
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            if (typeof body === 'object' && body !== null) {
                inputs = body;
            }
        } catch (e) {
            // Ignore JSON parse errors
        }
    }

    // 6. Get Code from S3 if available
    let code = deployment.snapshotCode;
    if (deployment.storageKey) {
        const s3Code = await ProjectStorage.getCode(deployment.storageKey);
        if (s3Code) {
            code = s3Code;
        } else {
            console.warn(`S3 code not found for deployment ${deploymentId}, falling back to DB snapshot`);
        }
    }

    // 7. Execute code
    // Construct API URL from request
    const protocol = request.nextUrl.protocol || 'http:';
    const host = request.headers.get('host') || 'localhost:3000';


    const wrappedCode = wrapCode(code, inputs);
    const rawResult = await executeCode(wrappedCode, 50000, token);
    
    // Process result for potential file outputs
    // Note: The route handles 'userId' from token owner, so we pass 'user.id'
    const processedResult = await processExecutionResult(rawResult, user.id);

    // Include remaining credits in header (optional but nice)
    const response = NextResponse.json(processedResult);
    response.headers.set('X-Remaining-Credits', (user.credits - 1).toString());
    
    return response;

  } catch (error) {
    console.error("FaaS Execution Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}