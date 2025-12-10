import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock systemConfig
jest.mock('@/lib/infra/config', () => ({
  systemConfig: {
    sandbox: {
      apiUrl: 'http://mock-sandbox',
      authToken: 'mock-token'
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('Browser Content API', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch.mockClear();
  });

  it('should return 400 if session ID is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/browser/content');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing session ID');
  });

  it('should fetch content from sandbox API', async () => {
    const mockHtml = '<html><body>Test</body></html>';
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const req = new NextRequest('http://localhost:3000/api/browser/content?sessionId=123');
    const res = await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://mock-sandbox/browser/sessions/123/content',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    const text = await res.text();
    expect(text).toBe(mockHtml);
  });

  it('should handle tabId parameter', async () => {
    const mockHtml = '<html><body>Tab Content</body></html>';
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const req = new NextRequest('http://localhost:3000/api/browser/content?sessionId=123&tabId=456');
    const res = await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://mock-sandbox/browser/sessions/123/content?tabId=456',
      expect.any(Object)
    );
  });

  it('should handle upstream errors', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const req = new NextRequest('http://localhost:3000/api/browser/content?sessionId=123');
    const res = await GET(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch content');
  });

  it('should handle internal errors', async () => {
    // @ts-ignore
    global.fetch.mockRejectedValue(new Error('Network error'));

    const req = new NextRequest('http://localhost:3000/api/browser/content?sessionId=123');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');
  });
});
