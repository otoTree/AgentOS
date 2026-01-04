
export interface SkillFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(): Promise<string[] | Record<string, any>>;
}
