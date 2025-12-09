import { s3Client, BUCKET_NAME } from "@/lib/storage/s3";
import { PutObjectCommand, GetObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

// Tenant Isolation Path Structure:
// Project Source: tenants/{userId}/projects/{projectId}/source.py
// Deployment Snapshot: tenants/{userId}/projects/{projectId}/deployments/{deploymentId}/source.py

export class ProjectStorage {
  
  static getProjectKey(userId: string, projectId: string): string {
    return `tenants/${userId}/projects/${projectId}/source.py`;
  }

  static getToolKey(userId: string, projectId: string, toolId: string): string {
    return `tenants/${userId}/projects/${projectId}/tools/${toolId}/source.py`;
  }

  static getDeploymentKey(userId: string, projectId: string, deploymentId: string): string {
    return `tenants/${userId}/projects/${projectId}/deployments/${deploymentId}/source.py`;
  }

  static async saveCode(key: string, code: string): Promise<void> {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: code,
        ContentType: "text/x-python",
      })
    );
  }

  static async getCode(key: string): Promise<string | null> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );

      if (!response.Body) return null;
      
      // The AWS SDK v3 stream handling
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray).toString("utf-8");
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  static async copySnapshot(sourceKey: string, destinationKey: string): Promise<void> {
    await s3Client.send(
        new CopyObjectCommand({
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${sourceKey}`,
            Key: destinationKey,
        })
    );
  }
}