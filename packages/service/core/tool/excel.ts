import { Excel } from '@agentos/office';
import { db } from '../../database';
import { files } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { StorageService } from '../storage/service';
import { Tool } from '@agentos/global';

class PostgresExcelStorage implements Excel.ExcelDocumentStorage {
    private storageService: StorageService;

    constructor() {
        this.storageService = new StorageService();
    }

    async load(id: string): Promise<ArrayBuffer> {
        // 1. Get file record
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 2. Download from Storage
        const buffer = await this.storageService.getObject(fileRecord.path);
        
        // Convert Node Buffer to ArrayBuffer
        // Note: buffer.buffer might reference a larger memory pool, so slice is important if we want a clean ArrayBuffer
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    }

    async save(id: string, buffer: ArrayBuffer): Promise<void> {
        // 1. Get file record to find path
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 2. Upload (overwrite)
        const nodeBuffer = Buffer.from(buffer);
        await this.storageService.uploadObject(fileRecord.path, nodeBuffer, fileRecord.type);
    }
}

const storage = new PostgresExcelStorage();
export const excelTools: Tool[] = Excel.createExcelTools(storage);
