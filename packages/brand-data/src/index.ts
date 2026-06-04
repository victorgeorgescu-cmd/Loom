import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CampaignType, SlotDef } from "@loom/shared";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const brandsDir = join(here, "..", "brands");
const templatesDir = join(here, "..", "templates");

const brandsJson: unknown = JSON.parse(readFileSync(join(here, "brands.json"), "utf8"));
const templatesJson: unknown = JSON.parse(readFileSync(join(here, "templates.json"), "utf8"));

// ── Brands ─────────────────────────────────────────────────
export const BrandMeta = z.object({
  name: z.string(),
  featuredPerson: z.string().nullable(),
  footerAddress: z.string().nullable(),
  tidConvention: z.string().nullable(),
  complianceBannedTerms: z.array(z.string()),
});
export type BrandMeta = z.infer<typeof BrandMeta>;

export interface Brand extends BrandMeta {
  slug: string;
  contextMd: string;
  styleMd: string;
}

const brandMetas = z.record(BrandMeta).parse(brandsJson);

export function listBrandSlugs(): string[] {
  return Object.keys(brandMetas);
}

export function loadBrand(slug: string): Brand {
  const meta = brandMetas[slug];
  if (!meta) throw new Error(`Unknown brand slug: ${slug}`);
  const contextMd = readFileSync(join(brandsDir, slug, "context.md"), "utf8");
  const styleMd = readFileSync(join(brandsDir, slug, "style.md"), "utf8");
  return { slug, ...meta, contextMd, styleMd };
}

// ── Templates ──────────────────────────────────────────────
const TemplateMeta = z.object({
  campaignType: CampaignType,
  file: z.string(),
  slots: z.array(SlotDef),
});
const templateMetas = z.record(TemplateMeta).parse(templatesJson);

export interface Template {
  id: string;
  campaignType: CampaignType;
  slots: SlotDef[];
  html: string;
}

export function listTemplateIds(): string[] {
  return Object.keys(templateMetas);
}

export function loadTemplate(id: string): Template {
  const meta = templateMetas[id];
  if (!meta) throw new Error(`Unknown template id: ${id}`);
  const html = readFileSync(join(templatesDir, meta.file), "utf8");
  return { id, campaignType: meta.campaignType, slots: meta.slots, html };
}
