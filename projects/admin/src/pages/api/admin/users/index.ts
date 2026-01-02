import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db, users, teamService } from '@agentos/service';
import { desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(session.user.id);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    try {
      const allUsers = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        columns: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
        }
      });
      return res.status(200).json(allUsers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).returning();

      return res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).code === '23505') { // Unique violation
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
