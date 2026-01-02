import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { skillService } from '@agentos/service/core/skill/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

  if (req.method === 'GET') {
    const { filename, raw } = req.query;
    if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'Filename required' });

    try {
      if (raw === 'true') {
        const buffer = await skillService.getSkillFileBuffer(id, filename);
        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        const mimeMap: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'pdf': 'application/pdf'
        };
        if (ext && mimeMap[ext]) {
            contentType = mimeMap[ext];
        }
        
        res.setHeader('Content-Type', contentType);
        res.send(buffer);
        return;
      }

      const content = await skillService.getSkillFile(id, filename);
      return res.status(200).json({ content });
    } catch (error: unknown) {
      console.error(error);
      return res.status(404).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { files, metaUpdates } = req.body;
      if (!files || typeof files !== 'object') return res.status(400).json({ error: 'Files map required' });
      
      const meta = await skillService.updateSkillFiles(id, files, metaUpdates);
      return res.status(200).json(meta);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'DELETE') {
    const { filename } = req.query;
    if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'Filename required' });

    try {
      const meta = await skillService.deleteSkillFile(id, filename);
      return res.status(200).json(meta);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
