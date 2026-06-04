import * as cheerio from "cheerio";

/**
 * Extract human-visible text from email HTML for content linting. Drops
 * <style>, hidden preheader nodes, and HTML comments (which carry the MSO
 * scaffold, not copy). Collapses whitespace. We deliberately keep this off the
 * raw string so banned-term scans don't trip over tag/attribute text.
 */
export function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("style, script").remove();
  // Hidden preheader and mso-hide nodes aren't visible copy in the body proper,
  // but the preheader IS read by inbox previews — keep it. Only drop display:none
  // that is clearly structural. For simplicity we keep all text nodes except
  // style/script, which is the conservative choice for compliance.
  return $("body").text().replace(/\s+/g, " ").trim();
}
