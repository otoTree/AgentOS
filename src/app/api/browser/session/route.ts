import { NextRequest, NextResponse } from 'next/server';

// Read from env, default to the value found in .env
import { systemConfig } from '@/lib/infra/config';
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
const AUTH_TOKEN = systemConfig.sandbox.authToken;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      },
      body: JSON.stringify({
        device: body.device || 'desktop',
        viewport: body.viewport
      })
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Browser session create error upstream:", text, "Status:", res.status);
        try {
            const errorJson = JSON.parse(text);
            return NextResponse.json(errorJson, { status: res.status });
        } catch {
             return NextResponse.json({ error: 'Failed to create session: ' + text }, { status: res.status });
        }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Browser session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${id}`, {
      method: 'DELETE',
      headers: {
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to delete session' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
