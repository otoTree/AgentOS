import type { NextApiRequest, NextApiResponse } from 'next';
import { db, skills } from '@agentos/service';
import { eq } from 'drizzle-orm';
import { skillService } from '@agentos/service/core/skill/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 1. Skill Check
        const { id } = req.query;
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

        const skill = await db.query.skills.findFirst({
            where: eq(skills.id, id)
        });
        
        if (!skill) return res.status(404).json({ error: 'Skill not found' });
        
        // 2. Deployment Check
        if (!skill.publicDeployedAt) {
            return res.status(404).json({ error: 'Skill not published' });
        }
        
        // 3. Run (No Auth required for public skills as per requirements)
        const result = await skillService.runSkill(id, req.body.input || {});
        return res.status(200).json(result);

    } catch (e: unknown) {
        console.error(e);
        const message = e instanceof Error ? e.message : 'Internal Server Error';
        return res.status(500).json({ error: message });
    }
}
