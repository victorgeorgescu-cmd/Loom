import type { LintFinding } from "@loom/shared";

/**
 * Catches two kinds of unresolved placeholder before export:
 *  1. Unfilled template tokens  {{like_this}}  (a slot the filler missed).
 *  2. Brand-file angle placeholders  <CAN-SPAM physical address>,
 *     <campaign tracking id>  — these ship in the brand .md files until you
 *     supply real values, and a literal "<CAN-SPAM physical address>" in the
 *     footer is both embarrassing and a CAN-SPAM violation.
 *
 * The angle-placeholder pattern is tuned to NOT match real HTML tags: it
 * requires whitespace inside and forbids "=", "/" and "<", which every real
 * tag/attribute string contains.
 */
const TOKEN_RE = /\{\{\s*[\w.]+\s*\}\}/g;
const ANGLE_PLACEHOLDER_RE = /<[^>=/<]*\s[^>=/<]*>/g;
// The same placeholder after HTML-escaping (the slot-filler escapes text, so a
// missing footer address arrives here as &lt;CAN-SPAM physical address&gt;).
const ESCAPED_ANGLE_RE = /&lt;[^&]*\s[^&]*&gt;/g;

export function lintPlaceholders(html: string): LintFinding[] {
  const findings: LintFinding[] = [];

  for (const m of html.matchAll(TOKEN_RE)) {
    findings.push({
      gate: "placeholder",
      severity: "error",
      message: `Unfilled template token: ${m[0]}`,
      excerpt: m[0],
    });
  }

  // Strip HTML/MSO comments first — the scaffold's conditional comments
  // (<!--[if mso]>…<![endif]-->) look like angle placeholders otherwise, and a
  // real placeholder never lives inside a comment.
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of withoutComments.matchAll(ANGLE_PLACEHOLDER_RE)) {
    findings.push({
      gate: "placeholder",
      severity: "error",
      message: `Unresolved placeholder: ${m[0]}`,
      excerpt: m[0],
    });
  }

  for (const m of html.matchAll(ESCAPED_ANGLE_RE)) {
    findings.push({
      gate: "placeholder",
      severity: "error",
      message: `Unresolved placeholder: ${m[0].replace(/&lt;/g, "<").replace(/&gt;/g, ">")}`,
      excerpt: m[0],
    });
  }

  return findings;
}
