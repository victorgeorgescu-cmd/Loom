import type { LintFinding } from "@loom/shared";

/**
 * The contentEditable safety net (B2). Full-document contentEditable can
 * silently eat the table scaffold or Outlook MSO conditional comments, which
 * breaks rendering in Outlook/Gmail without any visible error in the browser.
 * This export-time tripwire compares the structural fingerprint of the edited
 * HTML against the source template and blocks on drift.
 *
 * Fingerprint = count of locked-scaffold nodes + count of MSO conditional
 * comment open/close markers. Cheap, deterministic, and catches the failure
 * modes that matter (deleted ghost tables, stripped VML button, removed
 * data-locked wrappers).
 */
function fingerprint(html: string) {
  return {
    locked: (html.match(/data-locked="true"/g) ?? []).length,
    msoOpen: (html.match(/<!--\[if mso\]>/g) ?? []).length,
    msoClose: (html.match(/<!\[endif\]-->/g) ?? []).length,
    // The non-mso reveal comments around the HTML CTA fallback.
    msoNot: (html.match(/<!--\[if !mso\]>/g) ?? []).length,
  };
}

export function lintStructure(html: string, opts: { templateHtml: string }): LintFinding[] {
  const want = fingerprint(opts.templateHtml);
  const got = fingerprint(html);
  const findings: LintFinding[] = [];

  const checks: [keyof typeof want, string][] = [
    ["locked", "locked scaffold node(s) (data-locked)"],
    ["msoOpen", "Outlook MSO conditional open marker(s)"],
    ["msoClose", "Outlook MSO conditional close marker(s)"],
    ["msoNot", "non-Outlook reveal marker(s)"],
  ];

  for (const [key, label] of checks) {
    if (got[key] < want[key]) {
      findings.push({
        gate: "structure",
        severity: "error",
        message: `Email scaffold drifted: expected ${want[key]} ${label}, found ${got[key]}. Editing likely removed load-bearing structure.`,
      });
    }
  }
  return findings;
}
