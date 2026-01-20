import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';

// 定义 Skill 的根目录
// 目前设定为用户桌面下的 AgentOS/skills 目录，方便用户查看和编辑
export const SKILLS_ROOT_PATH = join(homedir(), 'Desktop', 'AgentOS', 'skills');
export const ARTIFACTS_ROOT_PATH = join(homedir(), 'Desktop', 'AgentOS', 'artifacts');

try {
    mkdirSync(SKILLS_ROOT_PATH, { recursive: true });
    mkdirSync(ARTIFACTS_ROOT_PATH, { recursive: true });
} catch (error) {
    console.error('Failed to create directories:', error);
}
