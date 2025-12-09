import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.file.findUnique({
    where: { id: params.id },
    include: { shares: true },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Check access (Owner or Shared)
  let hasAccess = file.userId === user.id;
  if (!hasAccess) {
    const share = file.shares.find(s => s.sharedWithUserId === user.id);
    if (share) hasAccess = true;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const s3Response = await FileStorage.getFileStream(file.s3Key);
    
    if (!s3Response.Body) {
        return NextResponse.json({ error: "File content not found" }, { status: 404 });
    }

    // Transform the WebReadableStream from S3 to a standard ReadableStream for Next.js response
    const stream = s3Response.Body.transformToWebStream();
    
    const headers = new Headers();
    headers.set("Content-Type", file.mimeType);
    headers.set("Content-Length", file.size.toString());

    const isDownload = request.nextUrl.searchParams.get("download") === "true";
    const disposition = isDownload ? "attachment" : "inline";
    // Use encodeURIComponent for standard filename* support
    const encodedFilename = encodeURIComponent(file.name);
    
    // Set Content-Disposition with proper encoding for various browsers
    headers.set(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodedFilename}`
    );

    return new NextResponse(stream, {
        status: 200,
        headers,
    });

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}