import { GET as GET_LIST, POST } from '../route';
import { GET as GET_DETAIL, PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/infra/prisma';
import { NextRequest } from 'next/server';

// Mock getAuthenticatedUser
jest.mock('@/lib/infra/auth-helper', () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/infra/auth-helper';

describe('Table API', () => {
  let user: any;
  let tableId: string;

  beforeAll(async () => {
    // Create a test user
    user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
      }
    });
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: user.id });
  });

  afterAll(async () => {
    // Cleanup
    if (user) {
      await prisma.tableDocument.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('should create a table', async () => {
    const req = new NextRequest('http://localhost:3000/api/tables', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Table', content: { sheets: [] } }),
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.name).toBe('Test Table');
    expect(data.id).toBeDefined();
    tableId = data.id;
  });

  it('should list tables', async () => {
    const req = new NextRequest('http://localhost:3000/api/tables');
    const res = await GET_LIST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe(tableId);
  });

  it('should get a table detail', async () => {
    const req = new NextRequest(`http://localhost:3000/api/tables/${tableId}`);
    const res = await GET_DETAIL(req, { params: { id: tableId } });
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.id).toBe(tableId);
    expect(data.content).toBeDefined();
  });

  it('should update a table', async () => {
    const req = new NextRequest(`http://localhost:3000/api/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Table' }),
    });
    const res = await PATCH(req, { params: { id: tableId } });
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.name).toBe('Updated Table');
  });

  it('should delete a table', async () => {
    const req = new NextRequest(`http://localhost:3000/api/tables/${tableId}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: { id: tableId } });
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Verify it's gone
    const checkReq = new NextRequest(`http://localhost:3000/api/tables/${tableId}`);
    const checkRes = await GET_DETAIL(checkReq, { params: { id: tableId } });
    expect(checkRes.status).toBe(404);
  });
});
