import type { GeneratedCopy } from "@loom/shared";
import type { Brand } from "@loom/brand-data";

/**
 * Mock generation path — engages when no ANTHROPIC_API_KEY is configured or
 * when the request explicitly sets `mock: true`. Returns canned, compliant
 * copy so the deployed app demos a real generated email end-to-end with zero
 * secrets. The copy passes the compliance linter and the placeholder linter.
 */
export function mockCopy(brand: Brand, brief: string): GeneratedCopy {
  return {
    headline: `${brand.name}: ${capitalize(briefTitle(brief))}`,
    body:
      `There was a time when every kitchen held a remedy.\n\n` +
      `This is a placeholder preview of the email — the layout, image slot, ` +
      `call to action, and footer are all live. Wire your Anthropic key into ` +
      `the environment and re-run generation to replace this with real copy ` +
      `from the brand voice in your context file.`,
    cta_text: "Read the Recipe",
    cta_url: "https://example.com/offer?utm_campaign=preview",
    testimonial: "Wonderful, gentle, and time-tested. — Preview testimonial",
    hero_image_brief: "vintage apothecary still life, dried herbs and amber glass bottles, soft natural side-light",
  };
}

function briefTitle(brief: string): string {
  return brief.slice(0, 60).replace(/[.!?]+$/, "");
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
