export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("LLM response did not contain JSON: " + text.slice(0, 300));
  }
  return JSON.parse(text.slice(start, end + 1));
}
