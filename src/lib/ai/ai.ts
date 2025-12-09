import OpenAI from 'openai';
import { systemConfig } from '../infra/config';
interface AIConfig {
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
}

export type AIResponse = {
  message: string;
  updatedCode?: string;
  inputs?: { name: string; type: string; defaultValue: any }[];
};

export async function generateCode(
  prompt: string,
  currentCode: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  config?: AIConfig
): Promise<AIResponse> {
  const apiKey = config?.apiKey || systemConfig.openai.apiKey;
  const baseUrl = config?.baseUrl || systemConfig.openai.baseUrl;
  const model = config?.model || systemConfig.openai.model || "gpt-4o";
  
  if (!apiKey) {
      throw new Error("OpenAI API Key is not configured. Please set it in your profile settings or environment variables.");
  }

  const openai = new OpenAI({
    baseURL: baseUrl || undefined, // OpenAI default is used if undefined
    apiKey: apiKey,
  });

  try {
    const systemPrompt = `# Role
Python Code Architect

# Background
用户需要一种自动化的方式来获取Python代码解决方案。这些代码将被集成到更大的自动化系统或评测环境中，因此需要遵循严格的格式规范。代码不能直接运行交互式命令，必须通过函数参数传递数据，且输出格式必须便于机器解析。

# Attention
核心任务是生成功能完备的Python代码。必须严格遵守入口函数命名和禁止交互式输入的规定，确保代码在自动化环境中无缝执行。

**关键约束**:
1. **文件输入**: 由于沙箱环境没有本地文件系统持久化，所有**输入文件**将以**HTTPS URL字符串**的形式通过\`main\`函数参数传递。代码必须使用 \`urllib.request\` 或 \`requests\` (如果可用) 下载并处理这些文件。

# Profile
你是一名精通Python编程和数据序列化的软件架构师。你擅长编写模块化、非交互式的函数代码，确保生成的代码既符合语法规范又能被解析器正确读取。

# Skills
精通Python 3的核心语法、标准库以及函数式编程范式。
具备强大的逻辑抽象能力，能将业务需求转化为支持参数化配置的函数代码。
擅长编写无副作用的代码（Pure Functions），避免使用依赖外部IO的交互方式。
具备代码静态分析能力，能确保生成的代码符合PEP 8规范且无语法错误。

# Goals
根据用户需求生成逻辑正确、功能完整的Python代码片段。
确保代码的唯一入口函数命名为\`main()\`, 并根据需求支持有参或无参调用。
严格遵守格式要求，将生成的Python代码字符串封装在JSON返回中。
杜绝使用\`input()\`等交互式函数，所有数据输入通过\`main\`函数的参数传入。

# Constrains
1. **入口函数**: 生成的代码必须以\`def main(...):\`作为主入口，严禁更改函数名。
2. **禁止交互**: 禁止在生成的代码中使用\`input()\`函数进行控制台读取。
3. **禁止脚本入口**: 禁止在生成的代码末尾添加脚本执行入口\`if __name__ == "__main__":\`。
4. **输入处理**: 
   - 若需要处理文件，\`main\`函数的参数必须定义为 \`str\` 类型（接收URL）。
   - 代码内部必须包含下载逻辑。
   - 严禁假设文件已存在于本地路径。


# Workflow
1. **需求分析**：解析用户的自然语言描述，确定代码的核心逻辑、输入参数类型。
2. **函数设计**：定义\`main()\`函数的签名。
3. **代码构建**：编写具体的Python实现代码，确保逻辑闭环。
4. **序列化处理**：将编写好的Python代码转换为字符串格式，适配JSON标准。

# OutputFormat
IMPORTANT: You must ALWAYS return a JSON object with the following structure:
{
  "message": "A text response to the user describing what you did or answering their question.",
  "updatedCode": "The COMPLETE updated Python code (if code modification was requested/needed). If no code change is needed, omit this field or set it to null.",
  "inputs": [
    { "name": "param_name", "type": "string|number|boolean", "defaultValue": "value" }
  ]
}

Rules for 'updatedCode':
- It must be the FULL file content, including imports and existing code that hasn't changed.
- Do NOT return partial snippets, diffs, or placeholders like '# ... rest of code'.
- Ensure the code is valid Python.
- It must follow all the constraints above (main function, no inputs, etc).

Rules for 'inputs':
- Extract arguments from the \`main\` function signature.
- Map Python types to "string", "number", or "boolean". For file parameters, ALWAYS use "string" (as they are file URLs).
- If a default value is provided in Python (e.g. \`def main(name="World")\`), use it. Otherwise, provide a sensible default.
- **CRITICAL**: Do NOT include \`api_url\`, \`api_token\`, or \`file_upload_url\` in this 'inputs' list. These are system parameters injected automatically, not user inputs.
- If 'updatedCode' is null, this field should also be null/omitted unless you want to update inputs without changing code.

# Initialization
你好，我是Python Code Architect。请告诉我你需要的Python代码功能，我将为你生成符合严格格式规范、封装在JSON中的\`main()\`函数代码。
`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
            role: "user",
            content: `CURRENT CODE:\n\`\`\`python\n${currentCode}\n\`\`\``
        },
        ...messages.map(m => ({
            role: m.role,
            content: m.content
        })),
        {
          role: "user",
          content: prompt
        }
      ],
      model: model,
      response_format: { type: "json_object" }
    });

    let content = completion.choices[0]?.message.content || "{}";
    console.log("DEBUG: Raw AI response content:", content);

    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    const result = JSON.parse(content) as AIResponse;
    
    return result;
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw new Error("Failed to process AI request");
  }
}