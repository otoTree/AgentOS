import { z } from 'zod';
import { PPTKernel } from './index';
import { Tool } from '@agentos/global';
import { PresentationState } from './model/schema';

export type PPTDocumentStorage = {
    load(id: string): Promise<PresentationState>;
    save(id: string, state: PresentationState): Promise<void>;
}

export const createPPTTools = (storage: PPTDocumentStorage): Tool[] => {
    return [
        {
            name: 'ppt_read_outline',
            description: 'Read the outline (slides structure and text) of a PPT presentation',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                const state = await storage.load(docId);
                const kernel = new PPTKernel(state);
                return kernel.agent.getPresentationOutline();
            }
        },
        {
            name: 'ppt_add_slide',
            description: 'Add a new slide to the presentation based on a concept',
            parameters: z.object({
                docId: z.string(),
                concept: z.string().describe('The concept or title for the new slide')
            }),
            execute: async ({ docId, concept }) => {
                const state = await storage.load(docId);
                const kernel = new PPTKernel(state);
                
                const slideId = kernel.agent.addSlideWithLayout(concept);
                
                await storage.save(docId, kernel.getState());
                return { success: true, slideId };
            }
        },
        {
            name: 'ppt_update_text',
            description: 'Update text content in a slide by matching a placeholder string',
            parameters: z.object({
                docId: z.string(),
                slideId: z.string(),
                placeholder: z.string().describe('The existing text to replace (or part of it)'),
                newText: z.string().describe('The new text content')
            }),
            execute: async ({ docId, slideId, placeholder, newText }) => {
                const state = await storage.load(docId);
                const kernel = new PPTKernel(state);
                
                const success = kernel.agent.updateTextByPlaceholder(slideId, placeholder, newText);
                
                if (success) {
                    await storage.save(docId, kernel.getState());
                    return { success: true };
                } else {
                    return { success: false, error: 'Placeholder not found' };
                }
            }
        }
    ];
};
