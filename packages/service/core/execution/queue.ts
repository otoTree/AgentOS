import { PgBoss } from 'pg-boss';

export class QueueService {
    private boss: PgBoss | null = null;
    private static instance: QueueService;

    public static getInstance(): QueueService {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }

    async init() {
        if (this.boss) return;

        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.warn('DATABASE_URL not set, skipping PgBoss init');
            return;
        }

        // @ts-ignore - PgBoss constructor might be tricky with types sometimes
        this.boss = new PgBoss(connectionString);
        this.boss.on('error', (error: any) => console.error(error));

        await this.boss.start();
        console.log('PgBoss started');
    }

    async addToQueue(queue: string, data: any) {
        if (!this.boss) throw new Error('Queue not initialized');
        return await this.boss.send(queue, data);
    }
    
    async subscribe(queue: string, handler: (job: any) => Promise<void>) {
        if (!this.boss) throw new Error('Queue not initialized');
        try {
            await this.boss.createQueue(queue);
            console.log(`[QueueService] Created queue: ${queue}`);
        } catch (error) {
            // Queue might already exist or other error
            // console.warn('Create queue error:', error);
        }
        await this.boss.work(queue, handler);
        console.log(`[QueueService] Subscribed to queue: ${queue}`);
    }
}

export const queueService = QueueService.getInstance();
