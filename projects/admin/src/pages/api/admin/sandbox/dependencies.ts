import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { teamService } from '@agentos/service';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(session.user.id);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  const reqPath = path.join(process.cwd(), '../../projects/sandbox/requirements.txt');

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(reqPath)) {
          return res.status(200).json({ dependencies: [] });
      }

      const content = fs.readFileSync(reqPath, 'utf-8');
      const dependencies = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      return res.status(200).json({ dependencies, raw: content });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { dependencies } = req.body;
      if (!Array.isArray(dependencies)) {
        return res.status(400).json({ error: 'Invalid dependencies format' });
      }

      const content = dependencies.join('\n');
      fs.writeFileSync(reqPath, content, 'utf-8');

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
