import { Request, Response } from 'express';
import { db, chatSessions, chatMessages, modelService } from '@agentos/service';
import { eq, desc, and } from 'drizzle-orm';

export const listSessions = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const sessions = await db.query.chatSessions.findMany({
        where: eq(chatSessions.userId, user.id),
        orderBy: [desc(chatSessions.updatedAt)]
      });
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const createSession = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { title } = req.body;
      
      const [session] = await db.insert(chatSessions).values({
        userId: user.id,
        title: title || 'New Chat',
      } as any).returning();
      
      res.status(201).json(session);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const deleteSession = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      
      // Verify ownership
      const session = await db.query.chatSessions.findFirst({
          where: and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id))
      });
      
      if (!session) return res.status(404).json({ error: { message: 'Session not found' } });

      await db.delete(chatSessions).where(eq(chatSessions.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      // Verify ownership
      const session = await db.query.chatSessions.findFirst({
          where: and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id))
      });
      
      if (!session) return res.status(404).json({ error: { message: 'Session not found' } });

      const messages = await db.query.chatMessages.findMany({
          where: eq(chatMessages.sessionId, id),
          orderBy: [desc(chatMessages.createdAt)],
          limit: 50
      });
      
      res.json(messages.reverse());
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message } });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { sessionId, message, model } = req.body;
        
        let currentSessionId = sessionId;

        // 1. Get or Create Session
        if (!currentSessionId) {
             const [newSession] = await db.insert(chatSessions).values({
                userId: user.id,
                title: message.substring(0, 50) || 'New Chat',
             } as any).returning();
             currentSessionId = newSession.id;
        } else {
             const session = await db.query.chatSessions.findFirst({
                 where: and(eq(chatSessions.id, currentSessionId), eq(chatSessions.userId, user.id))
             });
             if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
        }

        // 2. Save User Message
        await db.insert(chatMessages).values({
            sessionId: currentSessionId,
            role: 'user',
            content: message
        } as any);

        // 3. Get History
        const history = await db.query.chatMessages.findMany({
            where: eq(chatMessages.sessionId, currentSessionId),
            orderBy: [desc(chatMessages.createdAt)],
            limit: 10
        });
        
        const messages = history.reverse().map(m => ({ role: m.role as string, content: m.content }));

        // 4. Call AI
        // Need modelId. If model name provided, find ID.
        let modelId = model; 
        // Logic to find modelId if name passed (omitted for brevity, assume ID for now or implement helper)

        const responseContent = await modelService.chat(modelId, messages);

        // 5. Save Assistant Message
        await db.insert(chatMessages).values({
            sessionId: currentSessionId,
            role: 'assistant',
            content: responseContent
        } as any);

        res.json({ 
            sessionId: currentSessionId, 
            message: { role: 'assistant', content: responseContent } 
        });

      } catch (error: any) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: { message: error.message } });
      }
};

