import { type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'

export const PORT = process.env.PORT ? Number(process.env.PORT) : 8080
export const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev'
//console.log("[AUTH_TOKEN] ",AUTH_TOKEN)

// Browser Configuration
export const BROWSER_CONFIG = {
  maxSessions: process.env.MAX_BROWSER_SESSIONS ? Number(process.env.MAX_BROWSER_SESSIONS) : 10,
  sessionTimeout: process.env.BROWSER_SESSION_TIMEOUT ? Number(process.env.BROWSER_SESSION_TIMEOUT) : 600000, // 10 mins
  headless: process.env.BROWSER_HEADLESS !== 'false', // default true
  viewport: {
    width: process.env.BROWSER_VIEWPORT_WIDTH ? Number(process.env.BROWSER_VIEWPORT_WIDTH) : 1280,
    height: process.env.BROWSER_VIEWPORT_HEIGHT ? Number(process.env.BROWSER_VIEWPORT_HEIGHT) : 720,
  },
  device: process.env.BROWSER_DEVICE ? process.env.BROWSER_DEVICE as 'desktop' | 'mobile' : 'desktop'
}

// System-level highest security sandbox config
export const sandboxConfig: SandboxRuntimeConfig = {
  network: {
    allowedDomains: ['pypi.tuna.tsinghua.edu.cn'], // Allow Tsinghua PyPI Mirror
    deniedDomains: [],
    allowLocalBinding: false, // Block binding to local ports
    allowUnixSockets: [], // Block access to Unix sockets
  },
  filesystem: {
    // Extensive deny list for sensitive system and user files
    denyRead: [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/hosts',
      '~/.ssh',
      '~/.aws',
      '~/.kube',
      '~/.config',
      '~/.gitconfig',
      '~/.bash_history',
      '~/.zshrc',
      '~/.npmrc',
      '~/.docker',
      '~/.env'
    ],
    // Only allow writing to current working directory and tmp
    allowWrite: ['.', '/tmp'],
    // Protect project integrity by denying write to config, metadata and source
    denyWrite: [
      '.env',
      'secrets/',
      '.git/',
      '.github/',
      'node_modules/',
      'package.json',
      'bun.lockb',
      'yarn.lock',
      'tsconfig.json',
      'src/' // Prevent self-modification
    ],
  },
  // Disable fallback to weaker isolation - enforce strong sandbox or fail
  enableWeakerNestedSandbox: false,
}

// Storage Configuration
export const STORAGE_CONFIG = {
  bucketDir: process.env.STORAGE_BUCKET_DIR || '/tmp/agentos-sandbox-bucket',
  cleanupIntervalMs: process.env.STORAGE_CLEANUP_INTERVAL_MS ? Number(process.env.STORAGE_CLEANUP_INTERVAL_MS) : 10 * 60 * 1000, // 10 mins
  retentionMs: process.env.STORAGE_RETENTION_MS ? Number(process.env.STORAGE_RETENTION_MS) : 60 * 60 * 1000 // 1 hour
}

/**
 * Updates the allowed domains in the sandbox configuration.
 * This function modifies the configuration in place.
 * Note: SandboxManager needs to be reset and re-initialized for changes to take full effect.
 */
export function updateAllowedDomains(domains: string[]) {
  sandboxConfig.network.allowedDomains = domains;
}