import { Tool } from '@agentos/global';
import { weatherTool } from './weather';
import { wordTools } from './word';

export const builtInTools: Tool[] = [
    weatherTool,
    ...wordTools
];

export * from './weather';
export * from './word';
