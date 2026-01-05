
export type PromptTemplate = {
  name: string;
  description: string;
  template: string; // Handlebars or simple {{variable}} syntax
  variables: string[];
}

// Default dependencies (fallback)
const DEFAULT_DEPENDENCIES = ["可能没连上sandbox，默认依赖为空"];

export let SANDBOX_DEPENDENCIES = DEFAULT_DEPENDENCIES.join(', ');

export function updateSandboxDependencies(deps: string[]) {
    if (deps && deps.length > 0) {
        SANDBOX_DEPENDENCIES = deps.join(', ');
    }
}

export const PROMPTS = {
  // Skill Generation
  SKILL_GEN_STRUCTURE: {
    name: 'SKILL_GEN_STRUCTURE',
    description: 'Generate file structure for a new skill',
    template: `You are an expert Python developer building a "Skill" for AgentOS.
A Skill is a Python module that performs a specific task.
It runs in a sandboxed environment with specific pre-installed packages ({{dependencies}}).
All data files must be downloaded via network (e.g. from URLs in input). No local files exist initially.
You CANNOT install new pip packages.

Your task: Generate the file structure and meta.json for the user's request.

User Request: {{request}}

Constraints:
1. You MUST include 'SKILL.md' in the files list.
2. You MUST NOT generate 'requirements.txt', 'Pipfile', '.env', or 'README.md'.
3. The entrypoint must be 'src/main.py'.

Output Format (JSON):
{
  "name": "snake_case_name",
  "description": "Short description",
  "entry": "src/main.py",
  "files": ["src/main.py", "src/utils.py", "SKILL.md"],
  "input_schema": { ...JSON Schema... },
  "output_schema": { ...JSON Schema... },
  "explanation": "Brief explanation of the plan"
}
`,
    variables: ['request', 'dependencies']
  },

  SKILL_GEN_DOC: {
    name: 'SKILL_GEN_DOC',
    description: 'Generate documentation for the skill',
    template: `You are writing the documentation for the skill "{{name}}".
File: {{filename}}

Context:
{{context}}

Requirements:
1. Use Markdown format.
2. Follow the "Agent Skills" specification.
3. Structure:
   - # Title
   - ## Description
   - ## Usage
   - ## Examples (JSON input examples)
4. Do not include 'requirements.txt' installation steps (it's serverless).

Output:
Pure Markdown content.
`,
    variables: ['name', 'filename', 'context']
  },

  SKILL_GEN_CODE: {
    name: 'SKILL_GEN_CODE',
    description: 'Generate code for a specific file in the skill',
    template: `You are writing code for the skill "{{name}}".
File: {{filename}}

Context:
{{context}}

Requirements:
1. Use Python 3.10+
2. Handle errors gracefully (print to stderr, but don't crash if possible)
3. Entrypoint must be 'def main(...):' with explicitly named and typed arguments (e.g. def main(url: str, count: int) -> dict:). 
   - The 'main' function IS the entry point. 
   - It MUST accept arguments matching the input_schema.
   - It MUST return a JSON-serializable dict matching the output_schema.
   - Implement the actual logic inside 'main'.
4. The environment is a sandbox. All data files must be downloaded via network (e.g. from URLs in args). No local files exist initially.
5. Do NOT use external APIs unless explicitly requested.
6. Allowed libs: standard libs + {{dependencies}}.
7. Do NOT include 'if __name__ == "__main__":' block.
8. Do NOT generate 'requirements.txt' or '.env' content in this file.

Output:
Pure Python code for {{filename}}. No markdown blocks.
`,
    variables: ['name', 'filename', 'context', 'dependencies']
  },
  
  SKILL_REFINE_ERROR: {
      name: 'SKILL_REFINE_ERROR',
      description: 'Fix code based on error logs',
      template: `The skill "{{name}}" failed to run.
      
Code ({{filename}}):
{{code}}

Error Log:
{{error}}

Task: Fix the code to resolve the error. Return the FULL updated code for {{filename}}.
`,
      variables: ['name', 'filename', 'code', 'error']
  }
} as const;

export class PromptFactory {
    
    getPrompt(key: keyof typeof PROMPTS, vars: Record<string, string>): string {
        const promptDef = PROMPTS[key];
        let content: string = promptDef.template;
        
        // Auto-inject dependencies if needed
        const variables = { ...vars };
        if ((promptDef.variables as readonly string[]).includes('dependencies') && !variables.dependencies) {
            variables.dependencies = SANDBOX_DEPENDENCIES;
        }
        
        for (const v of promptDef.variables) {
            const val = variables[v] || '';
            // Simple replaceAll
            content = content.split(`{{${v}}}`).join(val);
        }
        
        return content;
    }
}

export const promptFactory = new PromptFactory();
