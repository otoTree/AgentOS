import type { NextApiRequest, NextApiResponse } from 'next';
import { db, users, teamService, systemService } from '@agentos/service';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
      .returning({ id: users.id, name: users.name, email: users.email });

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
      // Do not fail registration, but maybe log it.
    }

    return res.status(201).json({ user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
