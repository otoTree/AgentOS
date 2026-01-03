import { PromptTemplate } from '../core/types';

export class SimplePromptTemplate implements PromptTemplate {
  template: string;
  variables: string[];

  constructor(template: string) {
    this.template = template;
    this.variables = this.parseVariables(template);
  }

  private parseVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1].trim());
    }
    return Array.from(variables);
  }

  format(values: Record<string, any>): string {
    let result = this.template;
    for (const variable of this.variables) {
      if (values[variable] === undefined) {
        console.warn(`Variable "${variable}" not provided for prompt template.`);
        // 也可以选择抛出错误或者保留占位符
        continue;
      }
      const value = values[variable];
      const replacement = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Replace all occurrences
      result = result.split(`{{${variable}}}`).join(replacement);
      // Also handle spaces inside braces if needed (simple regex replacement is better)
      const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');
      result = result.replace(regex, replacement);
    }
    return result;
  }
}
