
export function extractJson<T = any>(text: string): T | null {
  try {
    // 1. Try parsing directly
    return JSON.parse(text);
  } catch {
    // Continue
  }

  // 2. Try extracting from markdown blocks ```json ... ```
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonBlockRegex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      // Continue
    }
  }

  // 3. Try extracting from markdown blocks without language ``` ... ```
  const blockRegex = /```\s*([\s\S]*?)\s*```/;
  const blockMatch = text.match(blockRegex);
  if (blockMatch) {
    try {
      return JSON.parse(blockMatch[1]);
    } catch {
      // Continue
    }
  }

  // 4. Try finding the first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Continue
    }
  }

  return null;
}
