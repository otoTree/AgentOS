interface ExecuteResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  signal: string | null;
}

export async function processExecutionResult(
  result: ExecuteResult, 
  _userId: string
): Promise<ExecuteResult> {
  // No special processing needed anymore as Python handles file uploads directly via API
  return result;
}