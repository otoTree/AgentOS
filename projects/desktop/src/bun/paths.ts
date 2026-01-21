import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';

// 定义 Skill 的根目录
// 目前设定为用户桌面下的 AgentOS/skills 目录，方便用户查看和编辑
export const SKILLS_ROOT_PATH = join(homedir(), 'Desktop', 'AgentOS', 'skills');
export const ARTIFACTS_ROOT_PATH = join(homedir(), 'Desktop', 'AgentOS', 'artifacts');
export const AGENTOS_ROOT_PATH = join(homedir(), 'Desktop', 'AgentOS');
export const PYTHON_ENV_ROOT_PATH = join(AGENTOS_ROOT_PATH, 'python-env');
export const BIN_ROOT_PATH = join(AGENTOS_ROOT_PATH, 'bin');
export const UV_BINARY_PATH = join(BIN_ROOT_PATH, 'uv');

try {
    mkdirSync(SKILLS_ROOT_PATH, { recursive: true });
    mkdirSync(ARTIFACTS_ROOT_PATH, { recursive: true });
    mkdirSync(PYTHON_ENV_ROOT_PATH, { recursive: true });
    mkdirSync(BIN_ROOT_PATH, { recursive: true });
} catch (error) {
    console.error('Failed to create directories:', error);
}
