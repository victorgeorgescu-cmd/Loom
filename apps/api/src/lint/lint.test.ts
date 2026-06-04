import { describe, it, expect } from "vitest";
import { lintCompliance } from "./compliance.js";
import { lintPlaceholders } from "./placeholders.js";
import { lintWeight } from "./weight.js";
import { lintAcTags } from "./acTags.js";
import { lintStructure } from "./structure.js";
import { lintImageGuardrail } from "./imageGuardrail.js";
import { GMAIL_CLIP_BYTES } from "@loom/shared";

const FHA_TERMS = ["cure", "cures", "treat", "treats", "heal", "heals", "fda approved"];

describe("compliance", () => {
  it("flags a banned term", () => {
    const f = lintCompliance("<p>This will cure your cough</p>", { bannedTerms: FHA_TERMS });
    expect(f.some((x) => x.message.includes("cure"))).toBe(true);
  });

  it("does not trip on substrings (treatment ≠ treat)", () => {
    const f = lintCompliance("<p>A gentle treatment-free approach</p>", { bannedTerms: FHA_TERMS });
    // "treatment" must not match \btreat\b; no banned-term finding expected.
    expect(f.filter((x) => x.message.startsWith("Banned term"))).toHaveLength(0);
  });

  it("flags FDA approved claim pattern", () => {
    const f = lintCompliance("<p>It is FDA approved</p>", { bannedTerms: FHA_TERMS });
    expect(f.length).toBeGreaterThan(0);
  });

  it("passes clean compliant copy", () => {
    const f = lintCompliance("<p>Soothe and support your body, time-tested.</p>", {
      bannedTerms: FHA_TERMS,
    });
    expect(f).toHaveLength(0);
  });
});

describe("placeholders", () => {
  it("flags unfilled tokens", () => {
    expect(lintPlaceholders("<p>{{headline}}</p>").length).toBe(1);
  });
  it("flags angle placeholders from brand files", () => {
    expect(lintPlaceholders("<p><CAN-SPAM physical address></p>").length).toBe(1);
  });
  it("does not flag real HTML tags", () => {
    const html = '<table role="presentation" width="600"><tr><td>hi</td></tr></table>';
    expect(lintPlaceholders(html)).toHaveLength(0);
  });
});

describe("weight", () => {
  it("passes a small email", () => {
    expect(lintWeight("<p>tiny</p>").some((f) => f.severity === "error")).toBe(false);
  });
  it("errors past the Gmail clip limit", () => {
    const big = "x".repeat(GMAIL_CLIP_BYTES + 10);
    expect(lintWeight(big).some((f) => f.severity === "error")).toBe(true);
  });
});

describe("ac-tags", () => {
  const template = '<a href="%UNSUBSCRIBELINK%">u</a><a href="%FORWARD2FRIEND%">f</a>';
  it("passes when all tags survive", () => {
    expect(lintAcTags(template, { templateHtml: template })).toHaveLength(0);
  });
  it("errors when a tag is dropped", () => {
    const edited = '<a href="%UNSUBSCRIBELINK%">u</a>';
    const f = lintAcTags(edited, { templateHtml: template });
    expect(f.some((x) => x.message.includes("FORWARD2FRIEND"))).toBe(true);
  });
});

describe("structure", () => {
  const template =
    '<table data-locked="true"><!--[if mso]><x><![endif]--><!--[if !mso]><!--><y><!--<![endif]--></table>';
  it("passes identical structure", () => {
    expect(lintStructure(template, { templateHtml: template })).toHaveLength(0);
  });
  it("errors when the locked scaffold is removed", () => {
    const edited = "<table><y></table>";
    expect(lintStructure(edited, { templateHtml: template }).length).toBeGreaterThan(0);
  });
});

describe("image guardrail", () => {
  it("never blocks a brand with no featured person", () => {
    expect(
      lintImageGuardrail({ featuredPerson: null, prompt: "a smiling woman holding herbs" }),
    ).toHaveLength(0);
  });
  it("blocks a person prompt for a featured-person brand", () => {
    expect(
      lintImageGuardrail({ featuredPerson: "Dr. Nicole Apelian", prompt: "a doctor in a lab" })
        .length,
    ).toBeGreaterThan(0);
  });
  it("allows when an approved headshot is supplied", () => {
    expect(
      lintImageGuardrail({
        featuredPerson: "Dr. Nicole Apelian",
        prompt: "portrait of the doctor",
        headshotUrl: "https://cdn.example.com/headshot.jpg",
      }),
    ).toHaveLength(0);
  });
  it("allows a non-person scene for a featured-person brand", () => {
    expect(
      lintImageGuardrail({
        featuredPerson: "Dr. Nicole Apelian",
        prompt: "dried herbs and amber glass bottles on aged wood",
      }),
    ).toHaveLength(0);
  });
});
