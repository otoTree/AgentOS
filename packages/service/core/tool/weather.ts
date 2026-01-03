import { z } from 'zod';
import { Tool } from '@agentos/global';

export const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get weather for a location',
  parameters: z.object({
    location: z.string()
  }),
  execute: async (args) => {
    return { temperature: 25, condition: 'Sunny', location: args.location };
  }
};
