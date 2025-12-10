import { NextRequest, NextResponse } from 'next/server';

import { systemConfig } from '@/lib/infra/config';
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
const AUTH_TOKEN = systemConfig.sandbox.authToken;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { tabId: string } }
) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const tabId = params.tabId;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  if (!tabId) {
    return NextResponse.json({ error: 'Missing tab ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/tabs/${tabId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to close tab' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Close tab error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
