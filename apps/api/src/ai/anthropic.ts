import Anthropic from "@anthropic-ai/sdk";
import type { Brand } from "@loom/brand-data";
import { GeneratedCopy } from "@loom/shared";
import { config } from "../config.js";
import { buildSystemPrompt } from "./prompt.js";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: config.anthropic.apiKey,
      baseURL: config.anthropic.baseURL,
    });
  }
  return client;
}

/**
 * Generate validated email copy. The system prompt (brand rules + context) is
 * sent as a cached block so repeated generations for the same brand only pay
 * for the brief. Output is parsed and validated against GeneratedCopy — a
 * malformed/over-claiming response fails here, before any image spend.
 */
export async function generateEmailCopy(brand: Brand, brief: string): Promise<GeneratedCopy> {
  const system = buildSystemPrompt(brand);

  const msg = await getClient().messages.create({
    model: config.anthropic.model,
    max_tokens: 1500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Write the email copy for this brief:\n\n${brief}\n\nReturn ONLY the JSON object.`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return GeneratedCopy.parse(extractJson(text));
}

/** Tolerant JSON extraction — strips accidental markdown fences or prose. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(candidate.slice(start, end + 1));
}
