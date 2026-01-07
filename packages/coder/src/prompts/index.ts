// 顶层全局规则 - 适用于所有生成任务
export const GLOBAL_CODER_RULES = `
Global Constraints & Standards:
1. Environment:
   - Run in a secure sandbox.
   - NO pip install allowed.
   - NO 'requirements.txt', 'Pipfile', or '.env' generation.
   - Use only standard libs and pre-installed packages ({{dependencies}}).
   - Network access is allowed for data downloading.

2. File System:
   - 'src/': Python source code (entrypoint: src/main.py).
   - 'assets/': Static resources (templates, default data).
   - 'references/': Documentation.
   - 'SKILL.md': Metadata and instructions.
   - Do NOT create files outside these directories.

3. Code Quality:
   - Python 3.10+ syntax.
   - Type hinting is mandatory.
   - Error handling: Print to stderr, do not crash.
   - STRICTLY FORBIDDEN: 'if __name__ == "__main__":'. The entrypoint is the 'main' function.
`;

// 结构生成 Prompt - 关注整体布局
export const SKILL_GEN_STRUCTURE_PROMPT = `You are an expert Python developer building a "Skill" for AgentOS.

${GLOBAL_CODER_RULES}

Your task: Generate the file structure and meta.json for the user's request.

User Request: {{request}}

Constraints:
1. You MUST include 'SKILL.md' in the files list.
2. The entrypoint must be 'src/main.py'.
3. Put executable code in 'src/', static assets in 'assets/', and docs in 'references/'.

Output Format (JSON):
{
  "name": "snake_case_name",
  "description": "Short description",
  "entrypoint": "src/main.py",
  "files": ["src/main.py", "src/utils.py", "SKILL.md", "assets/template.docx"],
  "input_schema": { ...JSON Schema... },
  "output_schema": { ...JSON Schema... },
  "explanation": "Brief explanation of the plan"
}
`;

// 文档生成 Prompt - 关注 SKILL.md 规范
export const SKILL_GEN_DOC_PROMPT = `You are writing the documentation for the skill "{{name}}".
File: {{filename}}

${GLOBAL_CODER_RULES}

Context:
{{context}}

Specific Requirements for SKILL.md:
1. Use Markdown format.
2. Include YAML Frontmatter at the top with:
   - name: {{name}}
   - description: (short description)
   - version: 1.0.0
3. Structure:
   - # Title
   - ## Description
   - ## Usage
   - ## Examples (JSON input examples)

Output:
Pure Markdown content with Frontmatter.
`;

// 代码生成 Prompt - 关注具体实现
export const SKILL_GEN_CODE_PROMPT = `You are writing code for the skill "{{name}}".
File: {{filename}}

${GLOBAL_CODER_RULES}

Context:
{{context}}

Specific Requirements for Code:
1. The 'main' function IS the entry point.
   - def main(args: dict) -> dict: or typed arguments.
   - It MUST accept arguments matching the input_schema.
   - It MUST return a JSON-serializable dict matching the output_schema.
2. You can access local files in 'assets/' using relative paths or strict absolute paths if known.
3. Implement the actual logic inside 'main'.

Output:
Pure Python code for {{filename}}. No markdown blocks.
`;

// 兼容旧的 Agent Prompt (逐步废弃或统一)
export const CODER_SYSTEM_PROMPT = `You are an expert AI software engineer.
${GLOBAL_CODER_RULES}
Your task is to help the user build or modify a "Skill".
You have access to the file system.
`;
