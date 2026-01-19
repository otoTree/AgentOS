import { Request, Response } from 'express';
import { datasetService, storageService, teamService } from '@agentos/service';
import multer from 'multer';

// Use memory storage for processing before upload to S3/OSS
const upload = multer({ storage: multer.memoryStorage() });

// --- Middleware wrapper for Multer ---
export const uploadMiddleware = upload.single('file');

export const uploadFile = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file uploaded' } });
      }

      const user = req.user!;
      const { teamId, folderId, fileId } = req.body;

      // Logic from projects/app/src/pages/api/dataset/upload.ts

      if (fileId) {
          // Update existing file
          const existingFile = await datasetService.getFile(fileId);
          if (!existingFile) return res.status(404).json({ error: { message: 'File not found' } });

          let canWrite = false;
          if (existingFile.uploadedBy === user.id) {
              canWrite = true;
          } else if (existingFile.teamId) {
              // @ts-ignore - checkPermission might be missing in type definition if not updated
              const perm = await datasetService.checkPermission(fileId, user.id, existingFile.teamId);
              if (perm === 'write' || perm === 'owner') canWrite = true;
          }
          if (!canWrite) return res.status(403).json({ error: { message: 'Permission denied' } });

          // Update Storage (Overwrite)
          await storageService.uploadRaw(existingFile.path, req.file.buffer, existingFile.type);

          // Update Metadata
          // @ts-ignore
          await datasetService.updateFileMetadata(fileId, {
              size: req.file.size,
          });

          return res.status(200).json({ success: true });
      }

      if (teamId) {
          const isMember = await teamService.isTeamMember(teamId, user.id);
          if (!isMember) {
              return res.status(403).json({ error: { message: 'Access denied' } });
          }
      }
      
      const fileData = {
          name: req.file.originalname || 'unknown',
          size: req.file.size,
          type: req.file.mimetype || 'application/octet-stream',
          buffer: req.file.buffer
      };
      
      const record = await storageService.uploadFile(
          teamId || null, 
          user.id, 
          fileData, 
          folderId || null
      );
      
      return res.status(201).json(record);

    } catch (error: any) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: { message: error.message } });
    }
};

export const list = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { parentId, teamId, source } = req.query;
      
      if (source !== 'personal' && source !== 'team') {
          return res.status(400).json({ error: { message: "Source must be 'personal' or 'team'" } });
      }

      if (source === 'team' && !teamId) {
          return res.status(400).json({ error: { message: "Team ID required for team source" } });
      }

      const data = await datasetService.list({
          parentId: parentId as string,
          teamId: teamId as string,
          userId: user.id,
          source: source as 'personal' | 'team'
      });

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const createFolder = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { name, parentId, teamId } = req.body;

      if (!name) return res.status(400).json({ error: { message: "Name required" } });

      const folder = await datasetService.createFolder({
          name,
          parentId,
          teamId,
          ownerId: user.id
      });

      res.status(201).json(folder);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const deleteFolder = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      await datasetService.deleteFolder(id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      // Assuming datasetService has deleteFile, usually wrapper around storageService + permission check
      // If not, implementing basic check here
      const file = await datasetService.getFile(id);
      if (!file) return res.status(404).json({ error: { message: 'File not found' } });

      if (file.uploadedBy !== user.id) {
           // Check team permission if needed
           if (file.teamId) {
              // @ts-ignore
               const perm = await datasetService.checkPermission(id, user.id, file.teamId);
               if (perm !== 'write' && perm !== 'owner') {
                   return res.status(403).json({ error: { message: 'Permission denied' } });
               }
           } else {
               return res.status(403).json({ error: { message: 'Permission denied' } });
           }
      }

      await storageService.deleteFile(id);
      res.json({ success: true });

    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

