import type { GeneratedCopy } from "@loom/shared";

/**
 * Fills the {{token}} slots in the canonical template. The model returns copy
 * only (validated as GeneratedCopy); everything that becomes visible text is
 * HTML-escaped here so generated copy can never inject markup into the
 * email-safe scaffold. `body`/`testimonial` are paragraphised (escaped, then
 * newline→<br> / blank-line→<p>) since the model emits plain text.
 */
export interface FillValues {
  preheader: string;
  brand_name: string;
  hero_image_url: string;
  hero_image_alt: string;
  headline: string;
  body: string;
  testimonial: string;
  cta_text: string;
  cta_url: string;
  footer_address: string;
}

export function buildFillValues(input: {
  copy: GeneratedCopy;
  brandName: string;
  heroImageUrl: string;
  footerAddress: string;
  preheader?: string;
}): FillValues {
  return {
    preheader: input.preheader ?? input.copy.headline,
    brand_name: input.brandName,
    hero_image_url: input.heroImageUrl,
    hero_image_alt: input.copy.hero_image_brief,
    headline: input.copy.headline,
    body: input.copy.body,
    testimonial: input.copy.testimonial ?? "",
    cta_text: input.copy.cta_text,
    cta_url: input.copy.cta_url,
    footer_address: input.footerAddress,
  };
}

export function fillTemplate(templateHtml: string, values: FillValues): string {
  const replacements: Record<string, string> = {
    preheader: escapeText(values.preheader),
    brand_name: escapeText(values.brand_name),
    // URL goes in src/href attributes — escape quotes/brackets only.
    hero_image_url: escapeAttr(values.hero_image_url),
    hero_image_alt: escapeAttr(values.hero_image_alt),
    headline: escapeText(values.headline),
    body: paragraphize(values.body),
    testimonial: escapeText(values.testimonial),
    cta_text: escapeText(values.cta_text),
    cta_url: escapeAttr(values.cta_url),
    footer_address: escapeText(values.footer_address),
  };

  return templateHtml.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    return key in replacements ? replacements[key]! : whole;
  });
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

function paragraphize(s: string): string {
  const blocks = s.trim().split(/\n{2,}/);
  return blocks
    .map((b) => `<p style="margin:0 0 16px 0;">${escapeText(b).replace(/\n/g, "<br />")}</p>`)
    .join("");
}
