
export interface PromptTemplate {
  name: string;
  description: string;
  template: string; // Handlebars or simple {{variable}} syntax
  variables: string[];
}

export const PROMPTS = {
  // Skill Generation
  SKILL_GEN_STRUCTURE: {
    name: 'SKILL_GEN_STRUCTURE',
    description: 'Generate file structure for a new skill',
    template: `You are an expert Python developer building a "Skill" for AgentOS.
A Skill is a Python module that performs a specific task.
It runs in a sandboxed environment with specific pre-installed packages (requests, beautifulsoup4, pandas, numpy).
You CANNOT install new pip packages.

Your task: Generate the file structure and meta.json for the user's request.

User Request: {{request}}

Output Format (JSON):
{
  "name": "snake_case_name",
  "description": "Short description",
  "entrypoint": "src/main.py",
  "files": ["src/main.py", "src/utils.py"],
  "input_schema": { ...JSON Schema... },
  "output_schema": { ...JSON Schema... },
  "explanation": "Brief explanation of the plan"
}
`,
    variables: ['request']
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
3. Entrypoint must have a 'def main(args):' function that returns a JSON-serializable dict.
4. Do NOT use external APIs unless explicitly requested.
5. Allowed libs: standard libs + requests, bs4, pandas, numpy.

Output:
Pure Python code for {{filename}}. No markdown blocks.
`,
    variables: ['name', 'filename', 'context']
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
        
        for (const v of promptDef.variables) {
            const val = vars[v] || '';
            // Simple replaceAll
            content = content.split(`{{${v}}}`).join(val);
        }
        
        return content;
    }
}

export const promptFactory = new PromptFactory();
