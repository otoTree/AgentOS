'use server';

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { systemConfig } from "@/lib/infra/config";
import { Workbook } from "@/components/konva-table/types";

// Helper to get S3 Client
function getS3Client() {
  const { s3 } = systemConfig;
  return new S3Client({
    region: s3.region,
    endpoint: s3.endpoint,
    credentials: {
      accessKeyId: s3.accessKeyId || '',
      secretAccessKey: s3.secretAccessKey || '',
    },
    forcePathStyle: true,
  });
}

const BUCKET_NAME = systemConfig.s3.bucketName;
const getPrefix = (userId: string) => `excel-tables/${userId}/`;
const getManifestKey = (userId: string) => `${getPrefix(userId)}manifest.json`;

interface WorkbookMeta {
  id: string;
  name: string;
  lastModified: number;
}

// Internal helper to get manifest
async function getManifest(client: S3Client, userId: string): Promise<WorkbookMeta[]> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: getManifestKey(userId) });
    const res = await client.send(cmd);
    const str = await res.Body?.transformToString();
    return str ? JSON.parse(str) : [];
  } catch (e: any) {
    if (e.name === 'NoSuchKey') return [];
    console.warn("Failed to load manifest", e);
    return [];
  }
}

// Internal helper to save manifest
async function saveManifest(client: S3Client, userId: string, manifest: WorkbookMeta[]) {
  try {
    await client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: getManifestKey(userId),
      Body: JSON.stringify(manifest),
      ContentType: 'application/json',
    }));
  } catch (e) {
    console.error("Failed to save manifest", e);
  }
}

export async function listWorkbooks(userId: string): Promise<{ workbooks: WorkbookMeta[]; error?: string }> {
  try {
    const client = getS3Client();
    const manifest = await getManifest(client, userId);
    return { workbooks: manifest };
  } catch (error: any) {
    console.error("Failed to list workbooks:", error);
    return { workbooks: [], error: error.message };
  }
}

export async function loadWorkbook(id: string, userId: string): Promise<{ workbook?: Workbook; error?: string }> {
  try {
    const client = getS3Client();
    const cmd = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${getPrefix(userId)}${id}.json`,
    });
    const res = await client.send(cmd);
    const str = await res.Body?.transformToString();
    if (!str) return { error: "Empty file" };
    return { workbook: JSON.parse(str) };
  } catch (error: any) {
    console.error(`Failed to load workbook ${id}:`, error);
    return { error: error.message };
  }
}

export async function saveWorkbookToOss(workbook: Workbook, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client();
    const json = JSON.stringify(workbook);
    
    // 1. Save Workbook Content
    await client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${getPrefix(userId)}${workbook.id}.json`,
      Body: json,
      ContentType: 'application/json',
    }));

    // 2. Update Manifest
    const manifest = await getManifest(client, userId);
    const idx = manifest.findIndex(w => w.id === workbook.id);
    const meta: WorkbookMeta = {
      id: workbook.id,
      name: workbook.name,
      lastModified: Date.now(),
    };

    if (idx >= 0) {
      manifest[idx] = meta;
    } else {
      manifest.push(meta);
    }
    await saveManifest(client, userId, manifest);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save workbook to OSS:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteWorkbookFromOss(workbookId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client();
    
    // 1. Delete Content
    await client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${getPrefix(userId)}${workbookId}.json`,
    }));

    // 2. Update Manifest
    const manifest = await getManifest(client, userId);
    const newManifest = manifest.filter(w => w.id !== workbookId);
    await saveManifest(client, userId, newManifest);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete workbook from OSS:", error);
    return { success: false, error: error.message };
  }
}
