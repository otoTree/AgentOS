import { NextRequest, NextResponse } from 'next/server';
import { systemConfig } from '@/lib/infra/config';
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
const AUTH_TOKEN = systemConfig.sandbox.authToken;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, action, tabId, ...params } = body;

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      },
      body: JSON.stringify({
        action,
        tabId,
        ...params
      })
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Browser action error upstream:", text, "Status:", res.status);
        try {
            const errorJson = JSON.parse(text);
            return NextResponse.json(errorJson, { status: res.status });
        } catch {
             return NextResponse.json({ error: 'Failed to execute action: ' + text }, { status: res.status });
        }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Browser action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
