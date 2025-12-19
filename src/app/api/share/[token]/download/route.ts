import { NextRequest, NextResponse } from "next/server";
import { fileShareRepository } from "@/lib/repositories/file-share-repository";
import { fileRepository } from "@/lib/repositories/file-repository";
import { FileStorage } from "@/lib/storage/file-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const share = await fileShareRepository.findByToken(params.token);

  if (!share || !share.isPublic) {
    return NextResponse.json({ error: "File not found or invalid link" }, { status: 404 });
  }

  const file = await fileRepository.findById(share.fileId);
  if (!file) {
      return NextResponse.json({ error: "File record missing" }, { status: 404 });
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
