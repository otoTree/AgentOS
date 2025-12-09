import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const share = await prisma.fileShare.findUnique({
    where: { token: params.token },
    include: { file: true },
  });

  if (!share || !share.file || !share.isPublic) {
    return NextResponse.json({ error: "File not found or invalid link" }, { status: 404 });
  }

  const file = share.file;

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
    headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);

    return new NextResponse(stream, {
        status: 200,
        headers,
    });

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}