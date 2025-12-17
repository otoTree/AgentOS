
export interface SOPStep {
  id: string;
  name: string;
  description: string;
  prompt: string;
  tool?: string;
  dependencies?: string[];
}

export interface SOPSequence {
  title: string;
  description: string;
  steps: SOPStep[];
}

export interface SavedSop {
    id: string;
    name: string;
    description: string;
    graph: SOPSequence;
    updatedAt: string;
    deployed: boolean;
}

export interface StepStatus {
    [key: string]: 'pending' | 'running' | 'completed';
}
