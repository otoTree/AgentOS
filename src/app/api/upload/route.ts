import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/storage/s3";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'avatar' | 'project'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Simple validation
    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: "File size limit is 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    // Decode filename to handle potential encoding issues
    const decodedName = Buffer.from(file.name, "latin1").toString("utf8");
    const ext = decodedName.split('.').pop();
    
    let folder = "misc";
    if (type === "avatar") folder = "avatars";
    else if (type === "project") folder = "projects";
    
    const filename = `${folder}/${session.user.id}-${uniqueSuffix}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Return the proxy URL
    // We rely on the [...key] route to handle slashes
    const url = `/api/images/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
  }
}