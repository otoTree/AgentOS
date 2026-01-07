import { Tool } from '@agentos/global';

import { wordTools } from './word';
import { pptTools } from './ppt';
import { excelTools } from './excel';

export const builtInTools: Tool[] = [
    ...wordTools,
    ...pptTools,
    ...excelTools
];

export * from './word';
export * from './ppt';
export * from './excel';
