import { z } from "zod";

/**
 * Shared contracts for Loom. Imported by both apps/api and apps/web so the
 * wire format has exactly one definition. Everything that crosses the network
 * (or comes back from the model) is validated against these.
 */

// ── Campaign types ─────────────────────────────────────────
// The old CLI flow recognised six. v0 only generates "sales"; the rest are
// modelled so the data layer and UI don't need a migration to add them.
export const CampaignType = z.enum([
  "sales",
  "newsletter",
  "webinar",
  "reengagement",
  "welcome",
  // "whatsapp" is intentionally excluded — it isn't email. Out of v0 scope.
]);
export type CampaignType = z.infer<typeof CampaignType>;

// ── Template slots ─────────────────────────────────────────
// A slot is a named, fillable region of the canonical template. `kind` drives
// both server-side filling and which editor affordance the cell gets.
export const SlotKind = z.enum(["text", "richtext", "img", "cta", "url"]);
export type SlotKind = z.infer<typeof SlotKind>;

export const SlotDef = z.object({
  key: z.string(), // matches data-slot="<key>" in the template HTML
  label: z.string(),
  kind: SlotKind,
  required: z.boolean().default(true),
});
export type SlotDef = z.infer<typeof SlotDef>;

// ── Structured copy returned by Claude ─────────────────────
// The model returns copy ONLY — never raw HTML. The server fills slots. This
// is what `anthropicClient.generateEmail` validates the model output against.
export const GeneratedCopy = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
  cta_text: z.string().min(1),
  cta_url: z.string().min(1), // may be a relative/merge-tag URL; validated downstream
  testimonial: z.string().optional(),
  hero_image_brief: z.string().min(1), // prompt for the image provider
});
export type GeneratedCopy = z.infer<typeof GeneratedCopy>;

// ── API: generate ──────────────────────────────────────────
export const GenerateRequest = z.object({
  templateId: z.string(),
  brand: z.string(), // brand slug, e.g. "fha"
  brief: z.string().min(1),
  // Skip the live AI/image calls and fill the template with canned compliant
  // copy + a placeholder hero. Auto-enabled server-side when no API keys are
  // configured, so the app is fully usable without secrets.
  mock: z.boolean().optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

export const GenerateResponse = z.object({
  projectId: z.string(),
  html: z.string(),
});
export type GenerateResponse = z.infer<typeof GenerateResponse>;

// ── API: images ────────────────────────────────────────────
export const ImageSize = z.enum(["1536x1024", "1024x1536", "1024x1024"]);
export type ImageSize = z.infer<typeof ImageSize>;

export const ImageRequest = z.object({
  prompt: z.string().min(1),
  brand: z.string(),
  size: ImageSize.default("1536x1024"),
  // Required when the brand has a featured (real) person and the image is of them.
  headshotUrl: z.string().url().optional(),
});
export type ImageRequest = z.infer<typeof ImageRequest>;

export const ImageResponse = z.object({ url: z.string().url() });
export type ImageResponse = z.infer<typeof ImageResponse>;

// ── API: projects ──────────────────────────────────────────
export const ProjectUpdate = z.object({
  html: z.string(),
  status: z.enum(["draft", "ready"]).optional(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdate>;

export const Project = z.object({
  id: z.string(),
  brandSlug: z.string(),
  templateId: z.string(),
  campaignType: CampaignType,
  brief: z.string(),
  html: z.string(),
  status: z.enum(["draft", "ready"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof Project>;

// ── Lint results ───────────────────────────────────────────
export const LintSeverity = z.enum(["error", "warn"]);
export type LintSeverity = z.infer<typeof LintSeverity>;

export const LintFinding = z.object({
  gate: z.enum([
    "compliance",
    "placeholder",
    "weight",
    "ac-tags",
    "structure",
    "image-guardrail",
  ]),
  severity: LintSeverity,
  message: z.string(),
  // Optional excerpt/location to help the user find it.
  excerpt: z.string().optional(),
});
export type LintFinding = z.infer<typeof LintFinding>;

export const LintReport = z.object({
  ok: z.boolean(), // false if any error-severity finding is present
  findings: z.array(LintFinding),
});
export type LintReport = z.infer<typeof LintReport>;

// Gmail clips messages past ~102KB of HTML.
export const GMAIL_CLIP_BYTES = 102 * 1024;
