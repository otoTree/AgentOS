import { AgentConfig, LLMClient, AgentCallbacks } from '../core/types';
import { SuperAgent } from '../core/agent';
import { ReadFileTool, WriteFileTool, ListFilesTool } from './tools/fs';
import { CODER_SYSTEM_PROMPT, SKILL_GEN_STRUCTURE_PROMPT, SKILL_GEN_CODE_PROMPT, SKILL_GEN_DOC_PROMPT } from './prompts';
import { SkillFileSystem } from './interfaces';
import { extractJson } from '@agentos/global';

export type SkillStructure = {
    name: string;
    description: string;
    entrypoint: string;
    files: string[];
    input_schema: any;
    output_schema: any;
    explanation: string;
}

export class CoderAgent {
  private agent: SuperAgent;

  constructor(
    private fs: SkillFileSystem,
    private llmClient: LLMClient,
    options?: {
        systemPrompt?: string;
        history?: any[];
    }
  ) {
    const tools = [
      new ReadFileTool(fs),
      new WriteFileTool(fs),
      new ListFilesTool(fs),
    ];

    const config: AgentConfig = {
      model: 'coder-agent', // Placeholder
      llmClient: this.llmClient,
      tools: tools,
      prompts: {
        system: options?.systemPrompt || CODER_SYSTEM_PROMPT,
      },
      history: options?.history || [],
      toolCallMethod: 'native', // Or 'json_prompt' depending on LLM
    };

    this.agent = new SuperAgent(config);
  }

  private renderPrompt(template: string, vars: Record<string, string>): string {
    let content = template;
    for (const [key, val] of Object.entries(vars)) {
        content = content.split(`{{${key}}}`).join(val || '');
    }
    return content;
  }

  async generateSkill(params: {
    request: string,
    dependencies: string
  }): Promise<SkillStructure> {
    const { request, dependencies } = params;

    // 1. Generate Structure
    const structurePrompt = this.renderPrompt(SKILL_GEN_STRUCTURE_PROMPT, {
        request,
        dependencies
    });
    
    console.log('[CoderAgent] Structure Prompt:', structurePrompt);

    const structureJsonRes = await this.llmClient.chat([
        { role: 'system', content: 'You are a JSON generator.' },
        { role: 'user', content: structurePrompt }
    ]);

    const structureContent = structureJsonRes.content || '';
    console.log('[CoderAgent] AI Structure Response:', structureContent);
    
    const structure = extractJson<SkillStructure>(structureContent);
    
    if (!structure) {
        throw new Error('Failed to parse AI response as JSON: ' + structureContent);
    }

    console.log('[CoderAgent] Parsed Structure:', JSON.stringify(structure, null, 2));

    // 1.5 Update Metadata immediately
    await this.fs.updateMeta({
        input_schema: structure.input_schema,
        output_schema: structure.output_schema,
        entrypoint: structure.entrypoint,
        name: structure.name,
        description: structure.description,
        files: structure.files
    });

    // 2. Generate Code for each file
    const BLACKLIST_FILES = ['requirements.txt', 'Pipfile', '.env', '.env.example', 'README.md'];
    
    for (const filename of structure.files) {
        // Skip blacklisted files
        if (BLACKLIST_FILES.includes(filename) || filename.endsWith('.pyc')) {
            console.log(`[CoderAgent] Skipping blacklisted file: ${filename}`);
            continue;
        }

        console.log(`[CoderAgent] Generating file: ${filename}`);

        // Select Prompt based on file type
        let promptTemplate = SKILL_GEN_CODE_PROMPT;
        let isDoc = false;

        if (filename.endsWith('.md') || filename === 'SKILL.md') {
            promptTemplate = SKILL_GEN_DOC_PROMPT;
            isDoc = true;
        }

        const codePrompt = this.renderPrompt(promptTemplate, {
            name: structure.name,
            filename,
            context: request,
            dependencies
        });

        if (isDoc) {
             console.log(`[CoderAgent] Doc Prompt for ${filename}:`, codePrompt);
        }

        const codeRes = await this.llmClient.chat([
            { role: 'system', content: isDoc ? 'You are a Technical Writer.' : 'You are a Python expert.' },
            { role: 'user', content: codePrompt }
        ]);

        const codeContent = codeRes.content || '';
        
        // Clean markdown
        let code = codeContent;
        if (isDoc) {
            // Remove wrapping markdown blocks if present, but keep internal markdown
            if (code.startsWith('```markdown')) {
                code = code.replace(/^```markdown\n?/, '').replace(/\n?```$/, '');
            } else if (code.startsWith('```')) {
                code = code.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }
        } else {
            code = codeContent.replace(/```python\n?|\n?```/g, '');
        }

        // 3. Write File
        await this.fs.writeFile(filename, code);
    }

    return structure;
  }


  async run(instruction: string, callbacks?: AgentCallbacks) {
    if (callbacks) {
        this.agent.setCallbacks(callbacks);
    }
    const result = await this.agent.run(instruction);
    
    // Find the last file written
    const history = this.agent.getContext().history;
    const writeActions = history.filter(a => a.type === 'tool_call' && a.toolName === 'write_file');
    
    let filename = '';
    let code = '';
    
    if (writeActions.length > 0) {
      const lastAction = writeActions[writeActions.length - 1];
      filename = lastAction.toolArgs.path;
      code = lastAction.toolArgs.content;
    }
    
    return {
      filename,
      code,
      explanation: result
    };
  }
}
