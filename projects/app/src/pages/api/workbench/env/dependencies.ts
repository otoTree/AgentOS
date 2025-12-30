import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      // Path to projects/sandbox/requirements.txt
      // Assuming process.cwd() is the project root or projects/app
      let reqPath = path.join(process.cwd(), 'projects/sandbox/requirements.txt');
      if (!fs.existsSync(reqPath)) {
        reqPath = path.join(process.cwd(), '../../projects/sandbox/requirements.txt');
      }
      
      if (!fs.existsSync(reqPath)) {
          // Fallback if not found
          return res.status(200).json({ dependencies: [] });
      }

      const content = fs.readFileSync(reqPath, 'utf-8');
      const dependencies = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      return res.status(200).json({ dependencies });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
