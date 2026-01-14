import { executionWorker } from '../core/execution/worker';

async function main() {
    console.log('Starting AgentOS Execution Worker...');
    
    // Start Worker
    await executionWorker.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received. Shutting down...');
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        console.log('SIGINT received. Shutting down...');
        process.exit(0);
    });
    
    // Keep alive
    console.log('Worker is running. Press Ctrl+C to stop.');
}

main().catch(error => {
    console.error('Worker failed to start:', error);
    process.exit(1);
});
