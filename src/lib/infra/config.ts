import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";

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
  // AI Configuration (User overrides)
  ai: {
    openai: {
      apiKey?: string; // 用户自定义的 OpenAI Key
      baseUrl?: string; // 用户自定义的 Base URL
      model?: string; // 用户偏好的模型
    };
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
  ai: {
    openai: {
      // 默认不设置 Key，使用系统配置或提示用户输入
      apiKey: undefined,
      baseUrl: systemConfig.openai.baseUrl,
      model: systemConfig.openai.model || 'gpt-4o',
    }
  },
  profile: {
    theme: 'system',
    language: 'en',
  },
  features: ['dashboard'],
};

// 2. 用户配置缓存 (内存)
// Map<UserId, UserConfig>
const userConfigCache = new Map<string, UserConfig>();

/**
 * 加载用户配置到缓存
 * 通常在用户登录或 Session 初始化时调用
 */
export const loadUserConfig = async (userId: string): Promise<UserConfig> => {
  if (!userId) {
    throw new Error("UserId is required to load config");
  }

  // 1. 尝试从数据库获取用户偏好
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openaiApiKey: true,
      openaiBaseUrl: true,
      openaiModel: true,
      name: true,
      username: true,
      email: true,
      image: true,
      // 未来可以添加 theme, language 等字段到数据库
    }
  });

  if (!user) {
    // 用户不存在，返回默认配置（不缓存）
    return { ...DEFAULT_CONFIG };
  }

  // 2. 合并数据库配置到默认配置
  const userConfig: UserConfig = deepMerge(DEFAULT_CONFIG, {
    ai: {
      openai: {
        apiKey: user.openaiApiKey || undefined,
        baseUrl: user.openaiBaseUrl || undefined,
        model: user.openaiModel || undefined,
      }
    },
    profile: {
      name: user.name || undefined,
      username: user.username || undefined,
      email: user.email || undefined,
      image: user.image || undefined,
    }
  });

  // 3. 写入缓存
  userConfigCache.set(userId, userConfig);
  
  return userConfig;
};

/**
 * 获取当前用户的配置 (优先从缓存读取)
 * 如果缓存未命中，则尝试异步加载 (此时可能返回默认值或抛出错误，取决于策略)
 * 这里采用：如果缓存没有，尝试同步加载默认值并触发异步刷新
 */
export const getUserConfig = (userId: string): UserConfig => {
  if (userConfigCache.has(userId)) {
    return JSON.parse(JSON.stringify(userConfigCache.get(userId)));
  }
  
  // 缓存未命中，返回默认配置，并在后台触发加载
  // 注意：这可能导致首次读取时配置不一致，但符合“不阻塞”原则
  // 更好的做法是在 Session 层确保 loadUserConfig 已完成
  loadUserConfig(userId).catch(console.error);
  
  return { ...DEFAULT_CONFIG };
};

/**
 * 更新用户配置
 * 1. 更新数据库
 * 2. 更新内存缓存
 */
export const updateUserConfig = async (userId: string, patch: DeepPartial<UserConfig>): Promise<UserConfig> => {
  if (!userId) {
    throw new Error("UserId is required to update config");
  }

  // 1. 获取当前配置
  let currentConfig = userConfigCache.get(userId);
  if (!currentConfig) {
    currentConfig = await loadUserConfig(userId);
  }

  // 2. 应用补丁 (内存合并)
  const newConfig = deepMerge(currentConfig, patch);

  // 3. 更新数据库 (按需映射字段)
  // 这里只映射我们已知存储在 User 表中的字段
  const dataToUpdate: any = {};
  
  if (patch.ai?.openai) {
    if (patch.ai.openai.apiKey !== undefined) dataToUpdate.openaiApiKey = patch.ai.openai.apiKey;
    if (patch.ai.openai.baseUrl !== undefined) dataToUpdate.openaiBaseUrl = patch.ai.openai.baseUrl;
    if (patch.ai.openai.model !== undefined) dataToUpdate.openaiModel = patch.ai.openai.model;
  }

  if (patch.profile) {
    if (patch.profile.name !== undefined) dataToUpdate.name = patch.profile.name;
    if (patch.profile.username !== undefined) dataToUpdate.username = patch.profile.username;
    if (patch.profile.image !== undefined) dataToUpdate.image = patch.profile.image;
    // email 通常不通过 config update 修改，因为它涉及验证逻辑
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
  }

  // 4. 更新缓存
  userConfigCache.set(userId, newConfig);

  return newConfig;
};

/**
 * 清除用户配置缓存 (例如登出时)
 */
export const clearUserConfig = (userId: string) => {
  userConfigCache.delete(userId);
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
      // @ts-ignore: 复杂的泛型推断在这里通常需要断言
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // 否则直接覆盖 (包括数组和基本类型)
      // @ts-ignore
      result[key] = sourceValue;
    }
  }

  return result;
}
