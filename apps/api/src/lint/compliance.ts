import type { LintFinding } from "@loom/shared";
import { extractVisibleText } from "../html/text.js";

/**
 * Compliance is a legal line for these health brands (fha/context.md:20,
 * hgw/context.md:24): remedies manage/support/soothe, never cure/treat/heal;
 * no "FDA approved"; no specific medical-outcome promises. This runs on
 * generation AND on every editor save/export — a human can type "cure" just
 * as easily as the model can.
 *
 * Deterministic, not vibes: a banned-term scan (per-brand list) plus a small
 * set of claim patterns. Word-boundary matched so "treatment" doesn't trip
 * "treat".
 */

// Generic medical-outcome / hype claim patterns applied to every brand.
const CLAIM_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bclinically proven\b/i, label: "absolute efficacy claim ('clinically proven')" },
  { re: /\bguaranteed to (?:cure|heal|fix|eliminate)\b/i, label: "guaranteed medical-outcome promise" },
  { re: /\bFDA[ -]?approved\b/i, label: "'FDA approved' claim" },
  { re: /\bcures? (?:your|the|all)?\s*\w+\b/i, label: "explicit cure claim" },
];

export function lintCompliance(
  html: string,
  opts: { bannedTerms: string[] },
): LintFinding[] {
  const text = extractVisibleText(html);
  const findings: LintFinding[] = [];

  for (const term of opts.bannedTerms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const m = re.exec(text);
    if (m) {
      findings.push({
        gate: "compliance",
        severity: "error",
        message: `Banned term for this brand: "${term}".`,
        excerpt: excerptAround(text, m.index),
      });
    }
  }

  for (const { re, label } of CLAIM_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      findings.push({
        gate: "compliance",
        severity: "error",
        message: `Non-compliant claim: ${label}.`,
        excerpt: excerptAround(text, m.index),
      });
    }
  }

  return findings;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerptAround(text: string, index: number, radius = 40): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
