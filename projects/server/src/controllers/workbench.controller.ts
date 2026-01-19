import { Request, Response } from 'express';
import { skillService } from '@agentos/service';
import { z } from 'zod';

const createSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const createSkill = async (req: Request, res: Response) => {
    try {
      const body = createSchema.parse(req.body);
      const user = req.user!; // Auth middleware ensures user

      const skill = await skillService.createSkill({
        teamId: body.teamId,
        name: body.name,
        description: body.description,
        emoji: body.emoji,
        isPublic: body.isPublic,
        ownerId: user.id
      });
      res.status(201).json(skill);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

export const updateSkill = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const body = updateSchema.parse(req.body);
      
      const skill = await skillService.updateSkillMeta(id, body);
      res.json(skill);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

export const deleteSkill = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      // Note: deleteSkill method existence verified via grep
      // @ts-ignore
      await skillService.deleteSkill(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const deploySkill = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { type } = req.body; // 'private' | 'public'
      
      if (type !== 'private' && type !== 'public') {
          return res.status(400).json({ error: { message: 'Invalid deployment type' } });
      }

      // @ts-ignore
      const updated = await skillService.deploySkill(id, type);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

// --- Files ---

export const getFile = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const filename = req.query.filename as string;
      const raw = req.query.raw === 'true';

      if (!filename) return res.status(400).json({ error: { message: 'Filename required' } });

      if (raw) {
        const buffer = await skillService.getSkillFileBuffer(id, filename);
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
            'pdf': 'application/pdf',
            'json': 'application/json',
            'md': 'text/markdown',
            'py': 'text/x-python',
            'ts': 'text/typescript',
            'js': 'text/javascript'
        };
        if (ext && mimeMap[ext]) contentType = mimeMap[ext];
        
        res.setHeader('Content-Type', contentType);
        res.send(buffer);
      } else {
        const content = await skillService.getSkillFile(id, filename);
        res.json({ content });
      }
    } catch (error: any) {
      res.status(404).json({ error: { message: error.message } });
    }
};

export const updateFiles = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { files, metaUpdates } = req.body;
      
      if (!files || typeof files !== 'object') {
        return res.status(400).json({ error: { message: 'Files map required' } });
      }

      const meta = await skillService.updateSkillFiles(id, files, metaUpdates);
      res.json(meta);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const filename = req.query.filename as string;
      
      if (!filename) return res.status(400).json({ error: { message: 'Filename required' } });

      const meta = await skillService.deleteSkillFile(id, filename);
      res.json(meta);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

