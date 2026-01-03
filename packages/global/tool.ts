import { z } from 'zod';

export interface Tool<T extends z.ZodType = any> {
  name: string;
  description: string;
  parameters: T;
  execute(args: z.infer<T>): Promise<any>;
}
