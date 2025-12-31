import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { teamService, sandboxClient } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for token first
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const sandboxToken = process.env.SANDBOX_TOKEN;
  
  const isInternalRequest = sandboxToken && token === sandboxToken;

  if (!isInternalRequest) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    // Verify Root
    const isRoot = await teamService.isRoot(session.user.id);
    if (!isRoot) return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const dependencies = await sandboxClient.getPackageSpecifiers();
      const raw = dependencies.join('\n');
      return res.status(200).json({ dependencies, raw });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, packages } = req.body;
      
      // Support direct action mode (install/uninstall)
      if (action && (action === 'install' || action === 'uninstall')) {
          if (!Array.isArray(packages) || packages.length === 0) {
              return res.status(400).json({ error: 'Packages list required' });
          }
          
          await sandboxClient.managePackages(action, packages);
          return res.status(200).json({ success: true });
      }

      // Legacy mode: Full list diff (keep for compatibility or bulk update if needed)
      // For now, let's simplify and rely on the new action mode from frontend.
      // If frontend sends 'dependencies' array, we fallback to diff logic (optional, but let's stick to user request for explicit actions)
      
      const { dependencies } = req.body;
      if (dependencies && Array.isArray(dependencies)) {
           // ... (Existing diff logic, kept for safety but maybe we encourage action mode)
           // Let's rewrite this part to be cleaner or just use the new mode.
           // Since we are rewriting the frontend too, let's pivot to action mode primarily.
           
           // Re-implementing simplified diff logic just in case:
            const currentDependencies = await sandboxClient.getPackageSpecifiers();
            const newDependencies = dependencies as string[];
            
            // Naive diff
            const added = newDependencies.filter(d => !currentDependencies.includes(d));
            const removed = currentDependencies.filter(d => !newDependencies.includes(d));
            
            if (removed.length > 0) {
                 // Clean package names
                 const packagesToUninstall = removed.map(p => p.split(/[=<>~]/)[0].trim());
                 await sandboxClient.managePackages('uninstall', packagesToUninstall);
            }
            if (added.length > 0) {
                await sandboxClient.managePackages('install', added);
            }
            return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid request body. Expected { action, packages } or { dependencies }' });

    } catch (error) {
      console.error('Dependency update error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
