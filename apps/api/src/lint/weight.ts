import { GMAIL_CLIP_BYTES, type LintFinding } from "@loom/shared";

/**
 * Gmail clips a message past ~102KB of HTML, hiding everything below the fold
 * (including the unsubscribe link). Hosted images keep the HTML lean — this is
 * the base64-bloat trap the old gen_image.py existed to avoid. We measure the
 * actual UTF-8 byte length of the final HTML.
 */
export function lintWeight(html: string): LintFinding[] {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes >= GMAIL_CLIP_BYTES) {
    return [
      {
        gate: "weight",
        severity: "error",
        message: `HTML is ${bytes} bytes (≥ ${GMAIL_CLIP_BYTES} Gmail clip limit). It will be clipped.`,
      },
    ];
  }
  // Soft warning as we approach the limit.
  if (bytes >= GMAIL_CLIP_BYTES * 0.9) {
    return [
      {
        gate: "weight",
        severity: "warn",
        message: `HTML is ${bytes} bytes — within 10% of the ${GMAIL_CLIP_BYTES} Gmail clip limit.`,
      },
    ];
  }
  return [];
}
