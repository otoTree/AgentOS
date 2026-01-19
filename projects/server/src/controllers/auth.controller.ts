import { Request, Response } from 'express';
import { db, users, teamService, systemService, eq, or } from '@agentos/service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string(), // Can be email or name
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({ id: users.id, name: users.name, email: users.email, avatar: users.avatar });

    // Handle Team Assignment
    try {
      const isMultiTeam = await systemService.isMultiTeamMode();
      
      if (isMultiTeam) {
        // Multi-Team Mode: Create personal team
        await teamService.createTeam(`${name}'s Team`, newUser.id);
      } else {
        // Single-Team Mode: Join Root Team
        const rootTeamId = await teamService.getRootTeamId();
        if (rootTeamId) {
           await teamService.addMember(rootTeamId, email, 'Member');
        } else {
           // Fallback: Create personal team if Root Team not found
           console.warn('Root team not found, creating personal team for user.');
           await teamService.createTeam(`${name}'s Team`, newUser.id);
        }
      }
    } catch (teamError) {
      console.error('Failed to assign team:', teamError);
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        picture: newUser.avatar
      },
      config.nextAuthSecret!,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user: newUser, token });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('Register Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(
        // @ts-ignore - Drizzle type mismatch
        or(
          eq(users.email, username),
          eq(users.name, username)
        )
      )
      .limit(1);

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.avatar
      },
      config.nextAuthSecret!,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: (error as z.ZodError).errors });
    }
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
