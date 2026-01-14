import { Tool } from '@agentos/global';

import { wordTools } from './word';
import { pptTools } from './ppt';
import { excelTools } from './excel';
import { fileTools } from './file';

export const builtInTools: Tool[] = [
    ...wordTools,
    ...pptTools,
    ...excelTools,
    ...fileTools
];

export * from './word';
export * from './ppt';
export * from './excel';
export * from './file';
export * from './execution';
