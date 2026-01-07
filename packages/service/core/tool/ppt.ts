import { PPT } from '@agentos/office';
import { db } from '../../database';
import { files } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { StorageService } from '../storage/service';
import { Tool } from '@agentos/global';

class PostgresPPTStorage implements PPT.PPTDocumentStorage {
    private storageService: StorageService;
    private parser: PPT.PPTXParser;
    private exporter: PPT.PPTXExporter;

    constructor() {
        this.storageService = new StorageService();
        this.parser = new PPT.PPTXParser();
        this.exporter = new PPT.PPTXExporter();
    }

    async load(id: string): Promise<PPT.PresentationState> {
        // 1. Get file record
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 2. Download from Storage
        const buffer = await this.storageService.getObject(fileRecord.path);

        // 3. Parse PPTX
        // parser.parse returns Partial<PresentationState>, but we need full state for tools
        // We can instantiate a temporary Kernel to get the default state + parsed state
        const kernel = new PPT.PPTKernel();
        await kernel.load(buffer);
        return kernel.getState();
    }

    async save(id: string, state: PPT.PresentationState): Promise<void> {
        // 1. Export to Buffer
        const buffer = await this.exporter.export(state);

        // 2. Get file record to find path
        const fileRecord = await db.query.files.findFirst({
            where: eq(files.id, id)
        });

        if (!fileRecord) {
            throw new Error(`File not found: ${id}`);
        }

        // 3. Upload (overwrite)
        // Convert ArrayBuffer to Buffer
        const nodeBuffer = Buffer.from(buffer);
        await this.storageService.uploadObject(fileRecord.path, nodeBuffer, fileRecord.type);
    }
}

const storage = new PostgresPPTStorage();
export const pptTools: Tool[] = PPT.createPPTTools(storage);
