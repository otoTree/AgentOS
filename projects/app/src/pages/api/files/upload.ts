import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { storageService, teamService } from '@agentos/service';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const form = formidable({});
    
    try {
      const [fields, files] = await form.parse(req);
      const teamId = fields.teamId?.[0];
      
      // if (!teamId) return res.status(400).json({ error: 'Team ID required' });
      
      if (teamId) {
          const isMember = await teamService.isTeamMember(teamId, session.user.id);
          if (!isMember) {
              return res.status(403).json({ error: 'Access denied' });
          }
      }

      const uploadedFile = files.file?.[0];
      if (!uploadedFile) return res.status(400).json({ error: 'No file uploaded' });

      // Convert formidable File to Web API File object (mocking for now since service expects File)
      // Actually my service expects `File`. In Node.js environment `File` might not be globally available or compatible.
      // I should update StorageService to accept Buffer or Stream.
      // But `storageService.uploadFile` takes `File`.
      // Let's read the file from disk (formidable saves to temp).
      
      const fileBuffer = fs.readFileSync(uploadedFile.filepath);
      
      const fileData = {
          name: uploadedFile.originalFilename || 'unknown',
          size: uploadedFile.size,
          type: uploadedFile.mimetype || 'application/octet-stream',
          buffer: fileBuffer
      };
      const record = await storageService.uploadFile(teamId || null, session.user.id, fileData);
      
      return res.status(201).json(record);
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return res.status(500).json({ error: message || 'Upload failed' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
