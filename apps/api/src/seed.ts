import {
  listBrandSlugs,
  loadBrand,
  listTemplateIds,
  loadTemplate,
} from "@loom/brand-data";
import { prisma } from "./db.js";

/**
 * Idempotent seed: mirrors the file-based brand/template definitions into
 * Postgres on boot so the generate pipeline has rows to read. The .md/.html
 * files remain the editable source of truth; this just syncs them in.
 */
export async function seed(): Promise<void> {
  for (const slug of listBrandSlugs()) {
    const b = loadBrand(slug);
    await prisma.brand.upsert({
      where: { slug },
      create: {
        slug,
        name: b.name,
        contextMd: b.contextMd,
        styleMd: b.styleMd,
        featuredPerson: b.featuredPerson,
        footerAddress: b.footerAddress,
        tidConvention: b.tidConvention,
      },
      update: {
        name: b.name,
        contextMd: b.contextMd,
        styleMd: b.styleMd,
        featuredPerson: b.featuredPerson,
        footerAddress: b.footerAddress,
        tidConvention: b.tidConvention,
      },
    });
  }

  for (const id of listTemplateIds()) {
    const t = loadTemplate(id);
    await prisma.template.upsert({
      where: { id },
      create: { id, campaignType: t.campaignType, html: t.html, slots: t.slots },
      update: { campaignType: t.campaignType, html: t.html, slots: t.slots },
    });
  }
}
