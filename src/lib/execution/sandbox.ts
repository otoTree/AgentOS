'use server';

import axios from 'axios';
import { systemConfig } from "@/lib/infra/config";
const SANDBOX_API_URL = systemConfig.sandbox.apiUrl || 'http://localhost:8080';
const SANDBOX_AUTH_TOKEN = systemConfig.sandbox.authToken;

if (!SANDBOX_AUTH_TOKEN) {
  console.warn('Warning: SANDBOX_AUTH_TOKEN is not set');
}

interface ExecuteResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  signal: string | null;
}

interface ExecuteError {
  error: string;
  details?: any;
}

export async function executeCode(code: string, timeoutMs: number = 5000,uploadToken?:string): Promise<ExecuteResult> {
  try {
    const response = await axios.post<ExecuteResult>(
      `${SANDBOX_API_URL}/execute`,
      {
        code,
        timeoutMs,
        uploadToken,
        fileUploadUrl:process.env.API_URL+'/api/files',
        public:true
      },
      {
        headers: {
          'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs + 1000, // Add buffer for network overhead
      }
    );

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as ExecuteError | undefined;

      console.error('Sandbox execution failed:', {
        status,
        data,
        message: error.message
      });

      // Return a synthesized error result instead of throwing, 
      // so the UI can display the error in the console area
      return {
        exitCode: status || 1,
        stdout: '',
        stderr: `Error communicating with sandbox: ${data?.error || error.message}\n${data?.details ? JSON.stringify(data.details, null, 2) : ''}`,
        signal: null,
      };
    }
    
    console.error('Unexpected sandbox error:', error);
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Unexpected internal error: ${error.message}`,
      signal: null,
    };
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${SANDBOX_API_URL}/health`, {
        headers: {
            'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}`,
        }
    });
    return response.status === 200 && response.data?.ok === true;
  } catch (error) {
    return false;
  }
}