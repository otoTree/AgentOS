import { s3Client, BUCKET_NAME } from "@/lib/storage/s3";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class FileStorage {
  static getFileKey(userId: string, fileId: string): string {
    return `tenants/${userId}/files/${fileId}`;
  }

  static async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  }

  static async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  }

  static async getFileStream(key: string) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    return await s3Client.send(command);
  }

  static async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    // Replace internal endpoint with external public endpoint if necessary
    // This is needed when running inside a cluster where S3_ENDPOINT is an internal service DNS
    const externalEndpointUrl = process.env.S3_EXTERNAL_ENDPOINT;
    
    if (externalEndpointUrl && process.env.S3_ENDPOINT && !process.env.S3_ENDPOINT.includes(externalEndpointUrl)) {
       try {
         const urlObj = new URL(url);
         const externalEndpoint = new URL(externalEndpointUrl);
         
         urlObj.protocol = externalEndpoint.protocol;
         urlObj.host = externalEndpoint.host;
         urlObj.port = externalEndpoint.port; // Use port from external endpoint if present
         
         return urlObj.toString();
       } catch (e) {
         console.warn("Failed to replace S3 endpoint with external URL", e);
         return url;
       }
    }

    return url;
  }
}