import { Request, Response, NextFunction } from 'express';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
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
    // 1. Check Authorization header (Bearer Token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.nextAuthSecret!) as any;
        req.user = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          image: decoded.picture || decoded.image,
        };
        return next();
      } catch (jwtError) {
        // Invalid token, fall through to cookie check or fail
        // If Bearer is provided but invalid, we should probably fail? 
        // But let's check cookie just in case.
        console.warn('Invalid Bearer token:', jwtError);
      }
    }

    // 2. Check Cookie (NextAuth)
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
