import type { LintFinding } from "@loom/shared";

/**
 * Real-person guardrail as CODE, not prose (hgw/context.md:20: "Dr. Nicole
 * Apelian is a REAL person. Never generate AI images of her."). The old CLI
 * relied on a careful operator obeying CLAUDE.md. An app with a "generate
 * image" button needs this enforced before any image spend.
 *
 * Rule: if the brand has a featured (real) person and the prompt implies a
 * person — generic person words OR the featured person's name — block
 * generation unless a supplied/approved headshot URL is provided instead.
 */
const PERSON_WORDS =
  /\b(person|people|man|woman|men|women|doctor|dr\.?|portrait|headshot|face|smiling|holding|wearing|hands?)\b/i;

export function lintImageGuardrail(opts: {
  featuredPerson: string | null;
  prompt: string;
  headshotUrl?: string;
}): LintFinding[] {
  if (!opts.featuredPerson) return [];
  if (opts.headshotUrl) return []; // explicit approved asset — allowed

  const nameRe = new RegExp(
    `\\b${opts.featuredPerson.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
  const impliesPerson = PERSON_WORDS.test(opts.prompt) || nameRe.test(opts.prompt);

  if (impliesPerson) {
    return [
      {
        gate: "image-guardrail",
        severity: "error",
        message: `This brand features a real person (${opts.featuredPerson}). AI generation of people is blocked — supply an approved headshotUrl, or restrict the prompt to backgrounds, ingredients, or botanicals.`,
      },
    ];
  }
  return [];
}
