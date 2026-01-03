import { Tool } from '@agentos/global';
import { weatherTool } from './weather';

export const builtInTools: Tool[] = [
    weatherTool
];

export * from './weather';
