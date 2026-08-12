import type { LlmClient } from "./types.js";

// Temporary free-tier stand-in for testing the request/response plumbing without
// spending API credit — genuinely free, no card, via https://aistudio.google.com/apikey.
// Same LlmClient interface as Anthropic, so swapping back is just LLM_PROVIDER=anthropic.
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL_DEFAULT = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// No cheaper tier exists below flash-lite in this app's usage — this is a
// separate env var (not just reusing MODEL_DEFAULT) so a future cheaper/faster
// Gemini model can be pointed at it without touching the default.
const MODEL_CHEAP = process.env.GEMINI_MODEL_CHEAP || MODEL_DEFAULT;

export function createGeminiClient(): LlmClient {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to server/.env."
    );
  }

  return {
    async complete(system, prompt, opts) {
      const model = opts?.tier === "cheap" ? MODEL_CHEAP : MODEL_DEFAULT;
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini API request failed (${res.status}): ${body.slice(0, 500)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error("Gemini response did not contain message content.");
      }
      return text;
    },
  };
}
