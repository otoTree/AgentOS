import { Tool } from '@agentos/superagent';
import { z } from 'zod';
import { SkillFileSystem } from '../interfaces';

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read the content of a file in the skill.';
  parameters = z.object({
    path: z.string().describe('The relative path of the file to read (e.g., "src/main.py").'),
  });

  constructor(private fs: SkillFileSystem) {}

  async execute(args: { path: string }) {
    try {
      const content = await this.fs.readFile(args.path);
      return content;
    } catch (error) {
      return `Error reading file ${args.path}: ${(error as Error).message}`;
    }
  }
}

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file in the skill. Creates the file if it does not exist.';
  parameters = z.object({
    path: z.string().describe('The relative path of the file to write (e.g., "src/main.py").'),
    content: z.string().describe('The content to write to the file.'),
  });

  constructor(private fs: SkillFileSystem) {}

  async execute(args: { path: string; content: string }) {
    try {
      await this.fs.writeFile(args.path, args.content);
      return `Successfully wrote to ${args.path}`;
    } catch (error) {
      return `Error writing file ${args.path}: ${(error as Error).message}`;
    }
  }
}

export class ListFilesTool implements Tool {
  name = 'list_files';
  description = 'List all files in the skill.';
  parameters = z.object({});

  constructor(private fs: SkillFileSystem) {}

  async execute() {
    try {
      const files = await this.fs.listFiles();
      return JSON.stringify(files);
    } catch (error) {
      return `Error listing files: ${(error as Error).message}`;
    }
  }
}
