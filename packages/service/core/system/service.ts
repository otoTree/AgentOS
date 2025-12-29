import { eq } from 'drizzle-orm';
import { db } from '../../database';
import { systemSettings } from '../../database/schema';

export const SYSTEM_SETTINGS_KEYS = {
  MULTI_TEAM_MODE: 'multi_team_mode',
} as const;

export class SystemService {
  
  async getSetting(key: string): Promise<string | null> {
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });
    return setting?.value || null;
  }

  async setSetting(key: string, value: string) {
    // Upsert
    await db.insert(systemSettings).values({
        key,
        value,
    } as any).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() } as any
    });
  }

  /**
   * Check if Multi-Team mode is enabled.
   * Default is false (Single Team Mode).
   */
  async isMultiTeamMode(): Promise<boolean> {
    const val = await this.getSetting(SYSTEM_SETTINGS_KEYS.MULTI_TEAM_MODE);
    return val === 'true';
  }

  async setMultiTeamMode(enabled: boolean) {
      await this.setSetting(SYSTEM_SETTINGS_KEYS.MULTI_TEAM_MODE, String(enabled));
  }
}

export const systemService = new SystemService();
