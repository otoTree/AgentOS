export type ParamInfo = {
  name: string;
  type: string;
  default?: unknown;
  required: boolean;
};

export function parsePythonEntrypoint(code: string): ParamInfo[] {
  // Find "def main(...)"
  const mainMatch = code.match(/def\s+main\s*\(([\s\S]*?)\)/);
  if (!mainMatch) return [];

  const argsStr = mainMatch[1];
  if (!argsStr.trim()) return [];

  // Split arguments by comma, respecting nested brackets
  const args: string[] = [];
  let currentArg = '';
  let depth = 0;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;

    if (char === ',' && depth === 0) {
      args.push(currentArg.trim());
      currentArg = '';
    } else {
      currentArg += char;
    }
  }
  if (currentArg.trim()) args.push(currentArg.trim());

  return args.map(arg => {
    // Remove comments
    arg = arg.split('#')[0].trim();
    if (!arg) return null;

    let name = arg;
    let type = 'any';
    let defaultValue = undefined;
    let required = true;

    // 1. Handle Default Value (split by first '=' outside brackets, but usually just first '=')
    // Naive split by '=' is okay for simple defaults. 
    // For "param: int = 5", split gives ["param: int ", " 5"]
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const lhs = arg.substring(0, eqIndex).trim();
      const rhs = arg.substring(eqIndex + 1).trim();
      
      name = lhs;
      defaultValue = rhs;
      required = false;

      // Parse simple Python literals
      if (defaultValue === 'True') defaultValue = true;
      else if (defaultValue === 'False') defaultValue = false;
      else if (defaultValue === 'None') defaultValue = null;
      else if ((defaultValue.startsWith('"') && defaultValue.endsWith('"')) || 
               (defaultValue.startsWith("'") && defaultValue.endsWith("'"))) {
        defaultValue = defaultValue.slice(1, -1);
      }
      else if (!isNaN(Number(defaultValue))) {
        defaultValue = Number(defaultValue);
      }
      // Arrays/Dicts kept as string for now if complex
    }

    // 2. Handle Type Hint
    // "name: type"
    const colonIndex = name.indexOf(':');
    if (colonIndex !== -1) {
      type = name.substring(colonIndex + 1).trim();
      name = name.substring(0, colonIndex).trim();
    }

    return { name, type, default: defaultValue, required } as ParamInfo;
  }).filter((p): p is ParamInfo => p !== null && p.name !== 'self' && p.name !== 'cls');
}

export function paramsToJsonSchema(params: ParamInfo[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  params.forEach(p => {
    let type = 'string';
    const rawType = p.type.toLowerCase();
    
    if (rawType === 'int' || rawType === 'integer') type = 'integer';
    else if (rawType === 'float' || rawType === 'number') type = 'number';
    else if (rawType === 'bool' || rawType === 'boolean') type = 'boolean';
    else if (rawType.startsWith('dict') || rawType === 'json') type = 'object';
    else if (rawType.startsWith('list') || rawType === 'array') type = 'array';

    properties[p.name] = { 
        type, 
        title: p.name 
    };
    
    if (p.default !== undefined) {
      const prop = properties[p.name] as Record<string, unknown>;
      prop.default = p.default;
    }
    
    if (p.required) {
      required.push(p.name);
    }
  });

  return {
    type: 'object',
    properties,
    required
  };
}
