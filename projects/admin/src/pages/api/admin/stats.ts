import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db, users, teamService } from '@agentos/service';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(session.user.id);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    try {
      // 1. Total Users
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);

      // 2. Sandbox Packages
      const reqPath = path.join(process.cwd(), '../../projects/sandbox/requirements.txt');
      let pkgCount = 0;
      if (fs.existsSync(reqPath)) {
        const content = fs.readFileSync(reqPath, 'utf-8');
        pkgCount = content.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
      }

      return res.status(200).json({
        userCount: Number(userCount.count),
        pkgCount: pkgCount,
        status: 'Healthy'
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
