import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/storage/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string | string[] } }
) {
  // Handle catch-all route param which comes as array
  const keyParts = Array.isArray(params.key) ? params.key : [params.key];
  const key = keyParts.join('/');

  if (!key) {
    return new NextResponse("Key is required", { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Convert the ReadableStream from S3 SDK to a Web ReadableStream
    // The AWS SDK v3 body is a complex stream, but in Node environment Next.js can handle it differently.
    // However, for Edge/Node compatibility, reading into buffer is safest for now or piping.
    // Let's try standard buffer approach for simplicity as images are small (max 5MB limit enforced).
    
    const byteArray = await response.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    console.error("Image proxy error:", error);
    if (error.name === 'NoSuchKey') {
        return new NextResponse("Image not found", { status: 404 });
    }
    return new NextResponse("Error fetching image", { status: 500 });
  }
}