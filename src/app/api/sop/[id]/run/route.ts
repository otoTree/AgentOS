import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { SopRunner } from "@/lib/execution/sop-runner";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const inputs = body.inputs || {};

    // Execute the workflow
    // Note: This might time out on serverless platforms if the workflow is long.
    const result = await SopRunner.executeWorkflow(params.id, user.id, inputs);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("SOP Execution API Failed:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
