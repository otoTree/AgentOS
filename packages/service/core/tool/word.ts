import { createWordTools, WordDocumentStorage, DocxParserPlugin, DocumentState } from '@agentos/office';
import { db } from '../../database';
import { files } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { StorageService } from '../storage/service';
import { Tool } from '@agentos/global';

class PostgresWordStorage implements WordDocumentStorage {
    private storageService: StorageService;
    private parser: DocxParserPlugin;

    constructor() {
        this.storageService = new StorageService();
        this.parser = new DocxParserPlugin();
    }

    async load(id: string): Promise<DocumentState> {
        // 1. Get file record
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 2. Download from Storage
        const buffer = await this.storageService.getObject(fileRecord.path);

        // 3. Parse Docx
        return this.parser.importDocx(buffer);
    }

    async save(id: string, state: DocumentState): Promise<void> {
        // 1. Export to Buffer
        const buffer = await this.parser.exportDocx(state);

        // 2. Get file record to find path
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 3. Upload (overwrite)
        await this.storageService.uploadObject(fileRecord.path, buffer, fileRecord.type);
    }
}

const storage = new PostgresWordStorage();
export const wordTools: Tool[] = createWordTools(storage);
