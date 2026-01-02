import type { NextApiRequest, NextApiResponse } from 'next';
import { db, apiKeys, skills } from '@agentos/service';
import { eq } from 'drizzle-orm';
import { skillService } from '@agentos/service/core/skill/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 1. Auth Check
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing Bearer token' });
        }
        const token = authHeader.split(' ')[1];
        
        const apiKey = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.key, token)
        });
        
        if (!apiKey) {
            return res.status(401).json({ error: 'Invalid API token' });
        }
        
        // 2. Skill Check
        const { id } = req.query;
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

        const skill = await db.query.skills.findFirst({
            where: eq(skills.id, id)
        });
        
        if (!skill) return res.status(404).json({ error: 'Skill not found' });
        
        // 3. Deployment Check
        if (!skill.privateDeployedAt) {
            return res.status(400).json({ error: 'Skill not deployed to private environment' });
        }
        
        // 4. Ownership/Permission Check
        // Enforce that only the owner can call the private endpoint with their token
        if (apiKey.userId !== skill.ownerId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this skill' });
        }

        // 5. Run
        const result = await skillService.runSkill(id, req.body.input || {});
        return res.status(200).json(result);

    } catch (e: unknown) {
        console.error(e);
        const message = e instanceof Error ? e.message : 'Internal Server Error';
        return res.status(500).json({ error: message });
    }
}
