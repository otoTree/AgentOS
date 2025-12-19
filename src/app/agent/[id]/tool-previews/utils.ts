
export function tryParseJson(str: string | undefined | null) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
