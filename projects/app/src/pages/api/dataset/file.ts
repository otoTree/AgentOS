import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { storageService, datasetService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
      const { id, raw } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

      const file = await datasetService.getFile(id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      let hasAccess = false;
      if (file.uploadedBy === session.user.id) {
          hasAccess = true;
      } else if (file.teamId) {
          // Check if user is member of this team
          const isMember = await teamService.isTeamMember(file.teamId, session.user.id);
          if (isMember) hasAccess = true;
      }

      // Check explicit shared permissions if no direct access
      if (!hasAccess) {
          const perm = await datasetService.checkPermission(id, session.user.id);
          if (perm !== 'none') hasAccess = true;
      }
      
      if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied' });
      }
      
      if (raw === 'true') {
        try {
            const buffer = await datasetService.getFileBuffer(id);
             // Determine content type
             const ext = file.name.split('.').pop()?.toLowerCase();
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
                 'pdf': 'application/pdf',
                 'txt': 'text/plain',
                 'md': 'text/markdown',
                 'json': 'application/json'
             };
             if (ext && mimeMap[ext]) {
                 contentType = mimeMap[ext];
             }
             
             res.setHeader('Content-Type', contentType);
             res.send(buffer);
             return;
        } catch {
            return res.status(404).json({ error: 'Content not found' });
        }
      }

      return res.status(200).json(file);
  }

  if (req.method === 'PUT') {
      // Update content
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

      const file = await datasetService.getFile(id);
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Permission Check
      let canWrite = false;
      if (file.uploadedBy === session.user.id) {
          canWrite = true;
      } else if (file.teamId) {
           const isMember = await teamService.isTeamMember(file.teamId, session.user.id);
           if (isMember) {
               // For now, assume team members can write team files?
               // Or maybe strict to owner?
               // "不支持成员在团队空间修改其他成员的文件，除非有权限"
               // So default is NO write for members unless owner.
               // Check explicit permission
               const perm = await datasetService.checkPermission(id, session.user.id, file.teamId);
               if (perm === 'write' || perm === 'owner') canWrite = true;
           }
      }

      if (!canWrite) {
          return res.status(403).json({ error: 'Permission denied' });
      }

      try {
          // We expect raw body or JSON with content?
          // For text editing, JSON { content: "..." } is easier.
          const { content } = req.body;
          if (typeof content !== 'string') return res.status(400).json({ error: 'Content required' });

          // Upload (Overwrite)
          // We need to construct a buffer from string
          const buffer = Buffer.from(content, 'utf-8');
          
          await storageService.uploadRaw(file.path, buffer, file.type || 'text/plain');
          
          // Update size in DB?
          // await db.update(files).set({ size: buffer.length }).where(eq(files.id, id));
          // For now skip size update or implement in service.

          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }

  if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

      const perm = await datasetService.checkPermission(id, session.user.id);
      if (perm !== 'owner') {
          return res.status(403).json({ error: 'Permission denied' });
      }

      try {
          await storageService.deleteFile(id);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }
  
  res.status(405).end();
}