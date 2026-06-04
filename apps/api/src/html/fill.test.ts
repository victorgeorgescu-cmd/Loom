import { describe, it, expect } from "vitest";
import { loadTemplate } from "@loom/brand-data";
import { buildFillValues, fillTemplate } from "./fill.js";
import { runExportGates } from "../lint/index.js";
import { GMAIL_CLIP_BYTES, type GeneratedCopy } from "@loom/shared";

const cleanCopy: GeneratedCopy = {
  headline: "Soothe the Season with Time-Tested Remedies",
  body: "There was a time every kitchen held a remedy.\n\nThis spring, we gathered the ones our grandmothers swore by — to support and soothe, the gentle way.",
  cta_text: "Discover the Remedy →",
  cta_url: "https://example.com/offer?utm_campaign=spring",
  testimonial: "It became part of my evening ritual. — Marian, subscriber",
  hero_image_brief: "vintage apothecary still life, dried herbs and amber glass bottles, soft side light",
};

describe("fillTemplate + export gates (no secrets)", () => {
  const template = loadTemplate("sales-single-hero");

  const values = buildFillValues({
    copy: cleanCopy,
    brandName: "The Forgotten Home Apothecary",
    heroImageUrl: "https://images.example.com/fha/p1/hero.png",
    footerAddress: "FHA LLC, 123 Herb Lane, Portland OR 97201",
  });
  const html = fillTemplate(template.html, values);

  it("replaces every token", () => {
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/);
  });

  it("uses the hosted R2 url in the hero img", () => {
    expect(html).toMatch(/<img[^>]+src="https:\/\/images\.example\.com\/fha\/p1\/hero\.png"/);
  });

  it("escapes generated copy (no raw injection)", () => {
    const nasty = fillTemplate(template.html, {
      ...values,
      headline: '<script>alert(1)</script>',
    });
    expect(nasty).not.toContain("<script>alert(1)</script>");
    expect(nasty).toContain("&lt;script&gt;");
  });

  it("stays under the Gmail clip limit", () => {
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(GMAIL_CLIP_BYTES);
  });

  it("passes the full export gate set with a real footer address", () => {
    const report = runExportGates(html, {
      bannedTerms: ["cure", "treat", "heal", "fda approved"],
      templateHtml: template.html,
    });
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("BLOCKS export when the footer address is left unfilled", () => {
    const placeholderHtml = fillTemplate(template.html, {
      ...values,
      footer_address: "<CAN-SPAM physical address>",
    });
    const report = runExportGates(placeholderHtml, {
      bannedTerms: ["cure"],
      templateHtml: template.html,
    });
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.gate === "placeholder")).toBe(true);
  });

  it("BLOCKS export when editing drops the unsubscribe tag", () => {
    const broken = html.replace("%UNSUBSCRIBELINK%", "#");
    const report = runExportGates(broken, {
      bannedTerms: ["cure"],
      templateHtml: template.html,
    });
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.gate === "ac-tags")).toBe(true);
  });
});
