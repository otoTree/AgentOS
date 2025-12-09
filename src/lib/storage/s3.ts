import { S3Client } from "@aws-sdk/client-s3";
import { systemConfig } from "@/lib/infra/config";

export const s3Client = new S3Client({
  region: systemConfig.s3.region || "us-east-1",
  endpoint: systemConfig.s3.endpoint,
  credentials: {
    accessKeyId: systemConfig.s3.accessKeyId || "",
    secretAccessKey: systemConfig.s3.secretAccessKey || "",
  },
  forcePathStyle: true, // Required for some S3-compatible storages like MinIO or internal cluster services
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "3kjgtco0-sandbox";