export type AppConfig = {
  name: string;
  version: string;
};

export const DEFAULT_CONFIG: AppConfig = {
  name: "AgentOS",
  version: "0.1.0",
};

export * from './tool';
export * from './utils/python-parser';
export * from './utils/json';
