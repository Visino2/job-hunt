// "cheap" picks the fastest/cheapest usable model for a provider — Haiku on
// Anthropic, whatever the already-cheapest configured model is on Gemini
// (there's no cheaper tier below flash-lite to drop to there). Omit tier
// (or pass "default") for calls where output quality matters more than cost.
export type ModelTier = "default" | "cheap";

export interface LlmClient {
  complete(system: string, prompt: string, opts?: { tier?: ModelTier }): Promise<string>;
}
