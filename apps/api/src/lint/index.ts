import type { LintFinding, LintReport } from "@loom/shared";
import { lintCompliance } from "./compliance.js";
import { lintPlaceholders } from "./placeholders.js";
import { lintWeight } from "./weight.js";
import { lintAcTags } from "./acTags.js";
import { lintStructure } from "./structure.js";

export { lintImageGuardrail } from "./imageGuardrail.js";

export interface ExportLintContext {
  bannedTerms: string[];
  templateHtml: string;
}

function toReport(findings: LintFinding[]): LintReport {
  return { ok: !findings.some((f) => f.severity === "error"), findings };
}

/**
 * Full gate set, run on export. Order is cheapest-first / most-legally-severe
 * first so the first error a user sees is the most important.
 */
export function runExportGates(html: string, ctx: ExportLintContext): LintReport {
  return toReport([
    ...lintCompliance(html, { bannedTerms: ctx.bannedTerms }),
    ...lintPlaceholders(html),
    ...lintAcTags(html, { templateHtml: ctx.templateHtml }),
    ...lintStructure(html, { templateHtml: ctx.templateHtml }),
    ...lintWeight(html),
  ]);
}

/**
 * Lighter set run on every editor save: compliance + AC-tag survival +
 * structure. (Weight/placeholder are export concerns.)
 */
export function runSaveGates(html: string, ctx: ExportLintContext): LintReport {
  return toReport([
    ...lintCompliance(html, { bannedTerms: ctx.bannedTerms }),
    ...lintAcTags(html, { templateHtml: ctx.templateHtml }),
    ...lintStructure(html, { templateHtml: ctx.templateHtml }),
  ]);
}
