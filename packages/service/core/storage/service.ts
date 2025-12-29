import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database';
import { files } from '../../database/schema';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Abstract Storage Interface
export type IStorageProvider = {
    upload(key: string, data: any, type: string): Promise<string>; // Returns URL or Path
    getDownloadUrl(key: string): Promise<string>;
    delete(key: string): Promise<void>;
}

// S3 Implementation
class S3Provider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;
    private publicUrl?: string;

    constructor() {
        const region = process.env.S3_REGION || process.env.OSS_REGION || 'us-east-1';
        const endpoint = process.env.S3_ENDPOINT || (process.env.OSS_ENDPOINT ? `https://${process.env.OSS_ENDPOINT}` : undefined);
        const accessKeyId = process.env.S3_ACCESS_KEY || process.env.OSS_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.S3_SECRET_KEY || process.env.OSS_ACCESS_KEY_SECRET || '';
        this.bucket = process.env.S3_BUCKET || process.env.OSS_BUCKET || 'agentos';
        this.publicUrl = process.env.S3_PUBLIC_URL; // Optional CDN/Public URL

        this.client = new S3Client({
            region,
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true, // Needed for MinIO and some S3 compatible providers
        });
    }

    async upload(key: string, data: any, type: string) {
        // Use @aws-sdk/lib-storage for easier multipart uploads if needed
        // For now, simple Upload helper
        const parallelUploads3 = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: data,
                ContentType: type,
            },
        });

        await parallelUploads3.done();

        // If public URL configured, return that, else return key (or signed url in getDownloadUrl)
        if (this.publicUrl) {
            return `${this.publicUrl}/${key}`;
        }
        return key;
    }

    async getDownloadUrl(key: string) {
        if (this.publicUrl) {
            return `${this.publicUrl}/${key}`;
        }
        
        // Generate Presigned URL
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        
        // Expire in 1 hour
        return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    }

    async delete(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.client.send(command);
    }
}

export class StorageService {
    private provider: IStorageProvider;

    constructor(provider?: IStorageProvider) {
        // Fallback to Mock if no keys provided? Or just fail?
        // Let's default to S3Provider, assuming envs are set or will fail gracefully
        this.provider = provider || new S3Provider();
    }

    async getDownloadUrl(key: string) {
        return this.provider.getDownloadUrl(key);
    }

    /**
     * Upload file and record metadata
     */
    async uploadFile(teamId: string | null, userId: string, file: { name: string, size: number, type: string, buffer?: Buffer, arrayBuffer?: () => Promise<ArrayBuffer> }, folderId?: string | null) {
        let buffer: Buffer;
        if (file.buffer) {
            buffer = file.buffer;
        } else if (file.arrayBuffer) {
            buffer = Buffer.from(await file.arrayBuffer());
        } else {
            throw new Error("File content (buffer or arrayBuffer) is required");
        }

        const hash = 'sha256-hash-placeholder'; // Calculate actual hash
        const ext = file.name.split('.').pop() || '';
        // Path isolation: teamId/userId/timestamp-filename
        const prefix = teamId || 'personal';
        const key = `${prefix}/${userId}/${Date.now()}-${file.name}`;

        // 1. Upload to Object Storage
        // Pass buffer directly
        const pathOrUrl = await this.provider.upload(key, buffer, file.type);

        // 2. Record Metadata
        const [record] = await db.insert(files).values({
            teamId: teamId || undefined, // undefined will be treated as NULL by some ORMs, but let's check drizzle behavior. Drizzle usually skips undefined keys or inserts null if nullable.
            folderId: folderId || undefined,
            name: file.name,
            size: file.size,
            type: file.type,
            extension: ext,
            bucket: process.env.S3_BUCKET || 'default',
            path: key,
            hash: hash,
            uploadedBy: userId,
        } as any).returning();

        // 3. Return record with Signed URL for immediate display
        const signedUrl = await this.provider.getDownloadUrl(key);

        return {
            ...record,
            url: signedUrl
        };
    }

    /**
     * Get file list for a team
     */
    async getTeamFiles(teamId: string) {
        const fileRecords = await db.query.files.findMany({
            where: eq(files.teamId, teamId),
            orderBy: (files, { desc }) => [desc(files.createdAt)],
            with: {
                uploader: {
                    columns: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        // Generate Signed URLs for all files
        // Note: In production with many files, this might be slow. 
        // Better to generate on demand or cache.
        // For MVP, we map all.
        return await Promise.all(fileRecords.map(async (f) => ({
            ...f,
            url: await this.provider.getDownloadUrl(f.path)
        })));
    }

    /**
     * Get personal files for a user
     */
    async getPersonalFiles(userId: string) {
        const fileRecords = await db.query.files.findMany({
            where: and(isNull(files.teamId), eq(files.uploadedBy, userId)),
            orderBy: (files, { desc }) => [desc(files.createdAt)],
            with: {
                uploader: {
                    columns: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        return await Promise.all(fileRecords.map(async (f) => ({
            ...f,
            url: await this.provider.getDownloadUrl(f.path)
        })));
    }

    async deleteFile(fileId: string) {
        const file = await db.query.files.findFirst({
            where: eq(files.id, fileId)
        });
        if (!file) throw new Error('File not found');

        // 1. Delete from Storage
        await this.provider.delete(file.path);

        // 2. Delete Metadata
        await db.delete(files).where(eq(files.id, fileId));
    }
}

export const storageService = new StorageService();
