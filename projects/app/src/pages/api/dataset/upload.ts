import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { storageService, teamService, datasetService } from '@agentos/service';
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
      const folderId = fields.folderId?.[0];
      const fileId = fields.fileId?.[0];
      
      const uploadedFile = files.file?.[0];
      if (!uploadedFile) return res.status(400).json({ error: 'No file uploaded' });

      const fileBuffer = fs.readFileSync(uploadedFile.filepath);

      if (fileId) {
          // Update existing file
          const existingFile = await datasetService.getFile(fileId);
          if (!existingFile) return res.status(404).json({ error: 'File not found' });

          let canWrite = false;
          if (existingFile.uploadedBy === session.user.id) {
              canWrite = true;
          } else if (existingFile.teamId) {
              const perm = await datasetService.checkPermission(fileId, session.user.id, existingFile.teamId);
              if (perm === 'write' || perm === 'owner') canWrite = true;
          }
          if (!canWrite) return res.status(403).json({ error: 'Permission denied' });

          // Update Storage (Overwrite)
          await storageService.uploadRaw(existingFile.path, fileBuffer, existingFile.type);

          // Update Metadata
          await datasetService.updateFileMetadata(fileId, {
              size: uploadedFile.size,
          });

          return res.status(200).json({ success: true });
      }

      if (teamId) {
          const isMember = await teamService.isTeamMember(teamId, session.user.id);
          if (!isMember) {
              return res.status(403).json({ error: 'Access denied' });
          }
      }
      
      const fileData = {
          name: uploadedFile.originalFilename || 'unknown',
          size: uploadedFile.size,
          type: uploadedFile.mimetype || 'application/octet-stream',
          buffer: fileBuffer
      };
      
      const record = await storageService.uploadFile(
          teamId || null, 
          session.user.id, 
          fileData, 
          folderId || null
      );
      
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