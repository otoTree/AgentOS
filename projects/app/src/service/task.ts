import axios from 'axios';

export interface Task {
    id: string;
    teamId: string;
    type: 'agent' | 'pipeline';
    instruction: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
    pipelineContext?: any;
    pipelineDefinition?: any; // Add this
    agentProfile?: any; // Add this
    skillIds?: string[]; // Add this
}

export interface TaskArtifact {
    id: string;
    taskId: string;
    type: 'file' | 'code' | 'link';
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    createdAt: string;
}

export class TaskService {
    static async getTasks(teamId: string): Promise<Task[]> {
        const res = await axios.get(`/api/tasks?teamId=${teamId}`);
        return res.data.tasks;
    }

    static async getTask(id: string): Promise<Task> {
        const res = await axios.get(`/api/tasks/${id}`);
        return res.data.task;
    }

    static async getTaskArtifacts(taskId: string): Promise<TaskArtifact[]> {
        const res = await axios.get(`/api/tasks/${taskId}/artifacts`);
        return res.data.artifacts;
    }
}
