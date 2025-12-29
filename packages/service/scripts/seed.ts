import { db } from '../database';
import { users, teams, teamMembers, roles } from '../database/schema';
import { teamService } from '../core/team/service';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Sync System Roles
  console.log('Syncing system roles...');
  await teamService.syncSystemRoles();

  // 2. Create Root User
  const rootEmail = process.env.ROOT_EMAIL || 'root@agentos.local';
  const rootPassword = process.env.ROOT_PASSWORD;
  
  if (!rootPassword) {
    console.warn('⚠️ ROOT_PASSWORD environment variable is not set. Skipping root user creation.');
    return;
  }

  const existingRoot = await db.query.users.findFirst({
    where: eq(users.email, rootEmail)
  });

  if (existingRoot) {
    console.log(`Root user (${rootEmail}) already exists. Updating password...`);
    const hashedPassword = await bcrypt.hash(rootPassword, 10);
    await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, existingRoot.id));
    console.log('Root password updated.');
  } else {
    console.log(`Creating root user (${rootEmail})...`);
    const hashedPassword = await bcrypt.hash(rootPassword, 10);
    
    const [user] = await db.insert(users).values({
        name: 'root',
        email: rootEmail,
        password: hashedPassword,
    }).returning();

    // Create a default "System" team for root
    console.log('Creating System team for root...');
    await teamService.createTeam('System', user.id);
    
    console.log('✅ Root user created successfully.');
  }

  console.log('🌱 Seed completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
