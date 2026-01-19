import { Request, Response } from 'express';
import { modelService, teamService } from '@agentos/service';

export const getProviders = async (req: Request, res: Response) => {
    try {
      // TODO: Add Admin Check
      const providers = await modelService.getProviders();
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const saveProvider = async (req: Request, res: Response) => {
    try {
      const provider = await modelService.saveProvider(req.body);
      res.json(provider);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

export const deleteProvider = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await modelService.deleteProvider(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const testConnection = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await modelService.testConnection(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

// --- Models ---

export const addModel = async (req: Request, res: Response) => {
    try {
      const providerId = req.params.providerId as string;
      const model = await modelService.addModel(providerId, req.body);
      res.json(model);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

export const updateModel = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const model = await modelService.updateModel(id, req.body);
      res.json(model);
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
};

export const deleteModel = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await modelService.deleteModel(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

