import { systemConfig } from "@/lib/infra/config";

export interface BrowserToolResult {
    output: string;
    browserState?: {
        sessionId?: string;
        url?: string;
        screenshot?: string;
    };
}

export async function handleBrowserTool(call: any): Promise<BrowserToolResult | null> {
    if (!call.name.startsWith('browser_')) return null;

    try {
        const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
        const SANDBOX_AUTH_TOKEN = systemConfig.sandbox.authToken;
        const headers = {
            'Content-Type': 'application/json',
            ...(SANDBOX_AUTH_TOKEN ? { 'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}` } : {})
        };
        
        let currentSessionId: string | undefined;
        let currentUrl: string | undefined;
        let currentScreenshot: string | undefined;
        let resultOutput = "";

        if (call.name === 'browser_open') {
            const { url } = call.arguments;
            // Create session
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ device: 'desktop' })
            });
            if (!res.ok) throw new Error('Failed to create browser session');
            const data = await res.json();
            const sessionId = data.sessionId;
            currentSessionId = sessionId;

            // Navigate if URL provided
            if (url) {
                const navRes = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/navigate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ url })
                });
                if (navRes.ok) {
                    const navData = await navRes.json();
                    currentUrl = navData.url;
                    currentScreenshot = navData.screenshot;
                }
            }
            resultOutput = `Browser opened. Session ID: ${sessionId}`;
        }
        else if (call.name === 'browser_navigate') {
            const { sessionId, url } = call.arguments;
            currentSessionId = sessionId;
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/navigate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ url })
            });
            if (!res.ok) throw new Error('Failed to navigate');
            const data = await res.json();
            currentUrl = data.url;
            currentScreenshot = data.screenshot;
            resultOutput = `Navigated to ${url}`;
        }
        else if (call.name === 'browser_click') {
            const { sessionId, selector } = call.arguments;
            currentSessionId = sessionId;
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'click', selector })
            });
            if (!res.ok) throw new Error('Failed to click');
            const data = await res.json();
            if (data.screenshot) currentScreenshot = data.screenshot;
            if (data.url) currentUrl = data.url;
            
            resultOutput = `Clicked on selector: ${selector}`;
        }
        else if (call.name === 'browser_type') {
            const { sessionId, text } = call.arguments;
            currentSessionId = sessionId;
            for (const char of text) {
                    await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ action: 'type', value: char })
                });
            }
            // Take a screenshot after typing
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'screenshot' }) 
            });
            if (res.ok) {
                const data = await res.json();
                if (data.screenshot) currentScreenshot = data.screenshot;
                if (data.url) currentUrl = data.url;
            }
            resultOutput = `Typed: ${text}`;
        }
        else if (call.name === 'browser_scroll') {
            const { sessionId, direction, amount } = call.arguments;
            currentSessionId = sessionId;
            const key = direction === 'up' ? 'PageUp' : 'PageDown';
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'press', value: key })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.screenshot) currentScreenshot = data.screenshot;
                if (data.url) currentUrl = data.url;
            }
            resultOutput = `Scrolled ${direction}`;
        }
        else if (call.name === 'browser_screenshot') {
            const { sessionId } = call.arguments;
            currentSessionId = sessionId;
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'screenshot' })
            });
                if (res.ok) {
                const data = await res.json();
                if (data.screenshot) currentScreenshot = data.screenshot;
                if (data.url) currentUrl = data.url;
            }

            resultOutput = "Screenshot taken (not returned to text context to save space).";
        }
        else if (call.name === 'browser_source') {
            const { sessionId } = call.arguments;
            currentSessionId = sessionId;
            const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/content`, {
                headers: {
                    ...(SANDBOX_AUTH_TOKEN ? { 'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}` } : {})
                }
            });
            if (!res.ok) throw new Error('Failed to get source');
            let html = await res.text();

            html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
            
            if (html.length > 50000) {
                html = html.substring(0, 50000) + "... (truncated)";
            }
            
            resultOutput = html;
        }
        
        return {
            output: resultOutput,
            browserState: currentSessionId ? {
                sessionId: currentSessionId,
                url: currentUrl,
                screenshot: currentScreenshot
            } : undefined
        };

    } catch (e: any) {
        return { output: "Browser Error: " + e.message };
    }
}
