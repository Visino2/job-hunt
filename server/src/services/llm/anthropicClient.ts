import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./types.js";

const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
const MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || "claude-haiku-4-5-20251001";

export function createAnthropicClient(): LlmClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and add your key."
    );
  }
  const client = new Anthropic({ apiKey });

  return {
    async complete(system, prompt, opts) {
      const model = opts?.tier === "cheap" ? MODEL_CHEAP : MODEL_DEFAULT;
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }],
      });

      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    },
  };
}
