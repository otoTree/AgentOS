import { userRepository } from "@/lib/repositories/auth-repository";
import { CacheService } from "@/lib/infra/cache";

// ==========================================
// 1. System Configuration (Environment Variables)
// ==========================================

export const systemConfig = {
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    secret: process.env.AUTH_SECRET,
    trustHost: process.env.AUTH_TRUST_HOST === 'true',
  },
  sandbox: {
    apiUrl: process.env.SANDBOX_API_URL || 'http://localhost:8080',
    authToken: process.env.SANDBOX_AUTH_TOKEN,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.S3_BUCKET_NAME || 'sandbox',
    region: process.env.S3_REGION || 'us-east-1',
    externalEndpoint: process.env.S3_EXTERNAL_ENDPOINT,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || process.env.BASE_URL,
    model: process.env.OPENAI_MODEL,
  },
  app: {
    url: process.env.API_URL || process.env.NEXTAUTH_URL,
  },
  external: {
    datasetId: process.env.DATASET_ID,
    rsUri: process.env.RS_URI,
    rsApiKey: process.env.RS_API_KEY,
  },
  agent:{
    maxTurns: process.env.AGENT_MAX_TURNS || 20,
  }
};

// ==========================================
// 2. User Configuration (Application Preferences)
// ==========================================

// 定义配置的形状
export interface UserConfig {
  network: {
    timeout: number;
    retryCount: number;
    apiEndpoint: string;
  };
  // User Profile
  profile: {
    name?: string;
    username?: string;
    email?: string;
    image?: string;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
  // User API Tokens (Platform Access Tokens)
  tokens?: Array<string>;
  features: string[]; // 启用的功能列表
}

// 1. 定义默认配置 (不可变基准)
const DEFAULT_CONFIG: UserConfig = {
  network: {
    timeout: 5000,
    retryCount: 3,
    apiEndpoint: 'https://api.example.com',
  },
  profile: {
    theme: 'system',
    language: 'en',
  },
  features: ['dashboard'],
};

// 2. 用户配置缓存 (Redis + Local)

/**
 * 从数据库加载用户配置
 */
async function fetchUserConfigFromDB(userId: string): Promise<UserConfig> {
  // 1. 尝试从数据库获取用户偏好
  const user = await userRepository.findById(userId);

  if (!user) {
    return { ...DEFAULT_CONFIG };
  }

  // 2. 合并数据库配置到默认配置
  return deepMerge(DEFAULT_CONFIG, {
    profile: {
      name: user.name || undefined,
      username: user.username || undefined,
      email: user.email || undefined,
      image: user.image || undefined,
    }
  });
}

/**
 * 加载用户配置 (优先从缓存)
 */
export const loadUserConfig = async (userId: string): Promise<UserConfig> => {
  if (!userId) throw new Error("UserId is required to load config");
  
  const config = await CacheService.get<UserConfig>(
      `user:config:${userId}`,
      () => fetchUserConfigFromDB(userId),
      60 * 15 // 15 minutes TTL
  );
  
  return config || { ...DEFAULT_CONFIG };
};

/**
 * 获取当前用户的配置
 */
export const getUserConfig = async (userId: string): Promise<UserConfig> => {
    return loadUserConfig(userId);
};

/**
 * 更新用户配置
 * 1. 更新数据库
 * 2. 更新缓存
 */
export const updateUserConfig = async (userId: string, patch: DeepPartial<UserConfig>): Promise<UserConfig> => {
  if (!userId) {
    throw new Error("UserId is required to update config");
  }

  // 1. 获取当前配置
  const currentConfig = await loadUserConfig(userId);

  // 2. 应用补丁 (内存合并)
  const newConfig = deepMerge(currentConfig, patch);

  // 3. 更新数据库 (按需映射字段)
  // 这里只映射我们已知存储在 User 表中的字段
  const dataToUpdate: any = {};
  
  if (patch.profile) {
    if (patch.profile.name !== undefined) dataToUpdate.name = patch.profile.name;
    if (patch.profile.username !== undefined) dataToUpdate.username = patch.profile.username;
    if (patch.profile.image !== undefined) dataToUpdate.image = patch.profile.image;
    // email 通常不通过 config update 修改，因为它涉及验证逻辑
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await userRepository.update(userId, dataToUpdate);
  }

  // 4. 更新缓存
  await CacheService.set(`user:config:${userId}`, newConfig, 60 * 15);

  return newConfig;
};

/**
 * 清除用户配置缓存 (例如登出时)
 */
export const clearUserConfig = async (userId: string) => {
  await CacheService.del(`user:config:${userId}`);
};

// --- 辅助工具 ---

// 递归 Partial 类型，允许深层属性也是可选的
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 简易的深合并函数 (Pure Function)
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target }; // 浅拷贝第一层

  for (const key in source) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // 如果双方都是对象，递归合并
      // @ts-ignore
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // 否则直接覆盖 (包括数组和基本类型)
      // @ts-ignore
      result[key] = sourceValue;
    }
  }

  return result;
}
