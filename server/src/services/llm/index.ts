import type { LlmClient } from "./types.js";
import { createAnthropicClient } from "./anthropicClient.js";
import { createGeminiClient } from "./geminiClient.js";

export type { LlmClient } from "./types.js";

// LLM_PROVIDER=anthropic (default) | gemini. Swap back to Claude any time by
// removing LLM_PROVIDER (or setting it to "anthropic") in server/.env — nothing
// else changes, since every provider implements the same LlmClient interface.
export function getLlmClient(): LlmClient {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  switch (provider) {
    case "anthropic":
      return createAnthropicClient();
    case "gemini":
      return createGeminiClient();
    default:
      throw new Error(`Unknown LLM_PROVIDER "${provider}". Use "anthropic" or "gemini".`);
  }
}
