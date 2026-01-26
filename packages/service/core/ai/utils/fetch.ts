
/**
 * Fetch with retry and timeout
 */
export async function fetchWithRetry(url: string, options: RequestInit & { timeout?: number, retries?: number } = {}) {
    const { timeout = 60000, retries = 2, ...fetchOptions } = options;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            clearTimeout(id);
            lastError = err;
            
            // Only retry on network errors or timeouts
            const isNetworkError = err.name === 'AbortError' || err.message.includes('fetch failed') || err.message.includes('timeout');
            
            if (isNetworkError && i < retries) {
                console.warn(`Fetch failed (attempt ${i + 1}/${retries + 1}), retrying...`, err.message);
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
