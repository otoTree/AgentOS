import OpenAI from "openai";
import { systemConfig } from "@/lib/infra/config";
export async function toolSearch(
  query: string
): Promise<string> {
  const apiKey = systemConfig.external.rsApiKey;
  const baseUrl = systemConfig.external.rsUri + "/v1";
  const model = systemConfig.openai.model || "gpt-4o";

  if (!apiKey) {
    throw new Error(
      "External RS API Key is not configured."
    );
  }

  const openai = new OpenAI({
    baseURL: baseUrl || undefined, // OpenAI default is used if undefined
    apiKey: apiKey,
  });

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      model: model,
    });

    let content = completion.choices[0]?.message.content || "";

    return content;
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw new Error("Failed to process AI request");
  }
}
