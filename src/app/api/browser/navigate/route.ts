import { NextRequest, NextResponse } from 'next/server';

import { systemConfig } from '@/lib/infra/config';
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
const AUTH_TOKEN = systemConfig.sandbox.authToken;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, url, waitUntil, tabId } = await req.json();

    if (!sessionId || !url) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const bodyPayload: any = {
      url,
      waitUntil: waitUntil || 'domcontentloaded'
    };

    if (tabId) {
      bodyPayload.tabId = tabId;
    }

    console.log(`[Browser Navigate] Session: ${sessionId}, Tab: ${tabId || 'default'}, URL: ${url}`);

    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Navigate error upstream:", text, "Status:", res.status);
        try {
             const errorJson = JSON.parse(text);
             return NextResponse.json(errorJson, { status: res.status });
        } catch {
             return NextResponse.json({ error: 'Failed to navigate: ' + text }, { status: res.status });
        }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Browser navigate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
