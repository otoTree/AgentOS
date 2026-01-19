import { Request, Response } from 'express';
import { skillService } from '@agentos/service';

export const list = async (req: Request, res: Response) => {
    try {
      const teamId = req.query.teamId as string | undefined;
      
      let skills;
      if (teamId) {
        skills = await skillService.listSkills(teamId);
      } else {
        skills = await skillService.listAllSkills();
      }
      
      res.json(skills);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const get = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const skill = await skillService.getSkill(id);
      res.json(skill);
    } catch (error: any) {
      res.status(404).json({ error: { message: error.message } });
    }
};

export const run = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { input } = req.body;
      
      const result = await skillService.runSkill(id, input);
      res.json(result);
    } catch (error: any) {
      console.error('Skill Run Error:', error);
      res.status(500).json({ error: { message: error.message } });
    }
};

