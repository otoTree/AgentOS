import { Request, Response, NextFunction } from 'express';
import { getToken } from 'next-auth/jwt';
import { config } from '../config';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getToken({ 
      req: req as any, 
      secret: config.nextAuthSecret,
      cookieName: 'next-auth.app-session-token' // Must match the one in NextJS app
    });

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = {
      id: token.id as string,
      name: token.name,
      email: token.email,
      image: token.picture,
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
