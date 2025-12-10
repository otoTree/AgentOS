import { NextRequest, NextResponse } from 'next/server';

import { systemConfig } from '@/lib/infra/config';
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
const AUTH_TOKEN = systemConfig.sandbox.authToken;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/tabs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch tabs' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Browser tabs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/tabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to create tab' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create tab error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
