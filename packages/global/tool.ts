import { z } from 'zod';

export type Tool<T extends z.ZodType = any> = {
  name: string;
  description: string;
  parameters: T;
  jsonSchema?: Record<string, any>;
  execute(args: z.infer<T>): Promise<any>;
}
