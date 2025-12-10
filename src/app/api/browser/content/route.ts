import { NextRequest, NextResponse } from 'next/server';
import { systemConfig } from '@/lib/infra/config';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const tabId = searchParams.get('tabId');

  const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
  const AUTH_TOKEN = systemConfig.sandbox.authToken;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  try {
    let url = `${SANDBOX_API_URL}/browser/sessions/${sessionId}/content`;
    if (tabId) {
      url += `?tabId=${tabId}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: res.status });
    }

    const html = await res.text();
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Browser content error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
