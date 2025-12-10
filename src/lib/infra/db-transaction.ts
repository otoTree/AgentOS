import { prisma } from "@/lib/infra/prisma";
import { Prisma } from "@prisma/client";

/**
 * Execute a function within a transaction with retry logic and specific isolation level.
 * 
 * @param fn The function to execute within the transaction context.
 * @param options Configuration options for the transaction.
 * @returns The result of the transaction function.
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    maxRetries?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
    timeout?: number;
  } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        isolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout = 5000
    } = options;

    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await prisma.$transaction(async (tx) => {
                return await fn(tx);
            }, {
                isolationLevel,
                maxWait: timeout, // Time to wait for a connection from the pool
                timeout: timeout  // Time the transaction is allowed to run
            });
        } catch (error: any) {
            attempts++;
            // Check if error is a retryable concurrency error
            // P2034: Transaction failed due to a write conflict or a deadlock.
            const isRetryable = error.code === 'P2034' || 
                                (error.message && (
                                    error.message.includes('deadlock') || 
                                    error.message.includes('could not serialize access')
                                ));
            
            if (!isRetryable || attempts >= maxRetries) {
                throw error;
            }
            
            // Exponential backoff with jitter
            const baseDelay = Math.pow(2, attempts) * 100;
            const jitter = Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
        }
    }
    throw new Error('Transaction failed after max retries');
}
