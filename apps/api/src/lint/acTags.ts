import type { LintFinding } from "@loom/shared";

/**
 * ActiveCampaign merge tags (%UNSUBSCRIBELINK%, %FORWARD2FRIEND%, etc.) are
 * inviolable tokens. The compliance/placeholder linters and the editor's
 * sanitizer all treat them as opaque; this gate is the backstop that confirms
 * every AC tag present in the source template survived editing. A dropped
 * %UNSUBSCRIBELINK% is a CAN-SPAM violation and an AC send error.
 */
const AC_TAG_RE = /%[A-Z0-9_]+%/g;

export function lintAcTags(html: string, opts: { templateHtml: string }): LintFinding[] {
  const expected = new Set(opts.templateHtml.match(AC_TAG_RE) ?? []);
  const present = new Set(html.match(AC_TAG_RE) ?? []);
  const findings: LintFinding[] = [];

  for (const tag of expected) {
    if (!present.has(tag)) {
      findings.push({
        gate: "ac-tags",
        severity: "error",
        message: `ActiveCampaign merge tag dropped during editing: ${tag}`,
        excerpt: tag,
      });
    }
  }
  return findings;
}
