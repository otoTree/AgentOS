import { NextApiRequest, NextApiResponse } from 'next';
import { SuperAgent } from '@agentos/agent';
import { ServiceLLMClient as AppLLMClient, ContextManager, createExecutionTools } from '@agentos/service';
import { db, chatSessions, chatMessages, teams } from '@agentos/service/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { eq, desc } from 'drizzle-orm';
import { skillService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { message, context, sessionId } = req.body;
    let currentSessionId = sessionId;
    
    // Find default team for user (assuming user has one for now)
    // For MVP, just pick the first team the user owns
    const team = await db.query.teams.findFirst({
        where: eq(teams.ownerId, session.user.id)
    });
    
    // Fallback if no team (should create one on signup ideally)
    const teamId = team?.id;

    // 1. Handle Session
    if (!currentSessionId) {
        // Create new session
        const [newSession] = await db.insert(chatSessions).values({
            userId: session.user.id,
            title: message.substring(0, 50) || 'New Chat', // Simple title generation
        } as unknown as typeof chatSessions.$inferInsert).returning();
        currentSessionId = newSession.id;
    } else {
        // Verify session exists and belongs to user
        const existing = await db.query.chatSessions.findFirst({
            where: (sessions, { eq, and }) => and(eq(sessions.id, currentSessionId), eq(sessions.userId, session.user.id))
        });
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }
    }

    // Fetch History (before inserting new message)
    let history: { role: string; content: string }[] = [];
    if (currentSessionId) {
        const recentMessages = await db.query.chatMessages.findMany({
            where: eq(chatMessages.sessionId, currentSessionId),
            orderBy: [desc(chatMessages.createdAt)],
            limit: 20
        });
        history = recentMessages.reverse().map(m => ({ role: m.role as string, content: m.content }));
    }

    // 2. Save User Message
    await db.insert(chatMessages).values({
        sessionId: currentSessionId,
        role: 'user',
        content: message,
    });
    
    // 3. Setup Agent
    const contextManager = new ContextManager();
    let skillsContextInfo = "";

    // Load Execution Tools (compile_pipeline, create_agent_task) if teamId exists
    if (teamId) {
        const executionTools = createExecutionTools(teamId, session.user.id);
        // Manually push to context manager (or add loadTools method)
        // contextManager.loadTools(executionTools); 
        // Since loadSkills logic is specific to skills, let's just hack it into getTools for now or expose a addTools
        // But contextManager.systemTools is private.
        // Let's assume we can modify ContextManager or just pass it to SuperAgent.
        // Actually ContextManager logic is a bit rigid in previous steps.
        // Let's just combine them when initializing SuperAgent.
    }

    if (context?.skills?.length) {
//...
        console.log('Received skills context:', context.skills);
        
        // Fetch full skill data if only IDs are provided
        const skillData = await Promise.all(
            context.skills.map(async (skill: string | Record<string, unknown>) => {
                if (typeof skill === 'string') {
                    try {
                        const fullSkill = await skillService.getSkill(skill);
                        // Fetch the main entry code for execution
                        const entry = fullSkill.meta.entry || fullSkill.meta.entrypoint || 'src/main.py';
                        const code = await skillService.getSkillFile(skill, entry);
                        
                        // Try to load SKILL.md if it exists
                        if (fullSkill.meta.files?.includes('SKILL.md')) {
                            try {
                                const skillMd = await skillService.getSkillFile(skill, 'SKILL.md');
                                if (skillMd) {
                                    skillsContextInfo += `\n\n# Skill Documentation (${fullSkill.name})\n${skillMd}`;
                                }
                            } catch (e) {
                                console.warn(`Failed to load SKILL.md for skill ${skill}`, e);
                            }
                        }
                        
                        // Merge DB data and Meta data, prioritize MetaJson for schema
                        return { 
                            ...fullSkill,
                            ...fullSkill.meta,
                            // Ensure input_schema is available from either source
                            input_schema: fullSkill.meta.input_schema || (fullSkill as unknown as Record<string, unknown>).inputSchema,
                            code 
                        };
                    } catch (e) {
                        console.error(`Failed to fetch skill ${skill}:`, e);
                        return null;
                    }
                }
                return skill;
            })
        );
        
        const validSkills = skillData.filter(Boolean);
        await contextManager.loadSkills(validSkills);
    }
    
    // Combine tools
    let allTools = contextManager.getTools();
    
    // Add Execution Tools
    if (teamId) {
        const executionTools = createExecutionTools(teamId, session.user.id);
        allTools = [...allTools, ...executionTools];
    }
    
    console.log('Received context tools:', JSON.stringify(allTools.map(t => ({
        name: t.name,
        description: t.description,
        jsonSchema: t.jsonSchema
    })), null, 2));

    // Find a valid model
    const model = await db.query.aiModels.findFirst({
        with: {
            provider: true
        }
    });

    if (!model) {
      return res.status(500).json({ error: 'No AI models configured' });
    }

    const agent = new SuperAgent({
      model: model.name,
      prompts: {
        system: `You are a helpful assistant.\n${skillsContextInfo}`,
        user: '{{input}}'
      },
      tools: allTools,
      llmClient: new AppLLMClient(model.id),
      toolCallMethod: 'json_prompt',
      history: history
    });

    // 4. Run Agent
    const response = await agent.run(message || 'Hello');

    // 5. Save Assistant Message
    await db.insert(chatMessages).values({
        sessionId: currentSessionId,
        role: 'assistant',
        content: response,
    });

    // Update session updated_at
    await db.update(chatSessions)
        .set({ updatedAt: new Date() } as unknown as typeof chatSessions.$inferInsert)
        .where(eq(chatSessions.id, currentSessionId));

    res.status(200).json({ response, sessionId: currentSessionId });
  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}
