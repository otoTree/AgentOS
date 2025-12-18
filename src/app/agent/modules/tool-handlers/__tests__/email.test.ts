
import { handleEmailTool } from '../email';
import { prisma } from '@/lib/infra/prisma';

// Mock prisma
jest.mock('@/lib/infra/prisma', () => ({
  prisma: {
    email: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('handleEmailTool', () => {
  const userId = 'user1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list emails', async () => {
    (prisma.email.findMany as jest.Mock).mockResolvedValue([
      {
        id: '1',
        subject: 'Test Email',
        from: 'sender@example.com',
        receivedAt: new Date('2023-01-01'),
        isRead: false,
      },
    ]);

    const result = await handleEmailTool({ name: 'email_list', arguments: {} }, userId);
    expect(result).toContain('Test Email');
    expect(result).toContain('sender@example.com');
    expect(prisma.email.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId },
      take: 10,
    }));
  });

  it('should get email details', async () => {
    (prisma.email.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      subject: 'Test Email',
      from: 'sender@example.com',
      to: 'me@example.com',
      receivedAt: new Date('2023-01-01'),
      body: 'Hello world',
      isRead: false,
    });

    const result = await handleEmailTool({ name: 'email_get', arguments: { emailId: '1' } }, userId);
    expect(result).toContain('Subject: Test Email');
    expect(result).toContain('Body');
    expect(result).toContain('Hello world');
    expect(prisma.email.update).toHaveBeenCalled(); // Should mark as read
  });
});
