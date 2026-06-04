import type { FastifyInstance, FastifyRequest } from "fastify";
import { loadBrand, loadTemplate } from "@loom/brand-data";
import { GenerateRequest, type GenerateResponse } from "@loom/shared";
import { generateEmailCopy } from "../ai/anthropic.js";
import { mockCopy } from "../ai/mockCopy.js";
import { getImageProvider } from "../ai/imageProvider/index.js";
import { uploadImage } from "../storage/r2.js";
import { buildFillValues, fillTemplate } from "../html/fill.js";
import { lintCompliance } from "../lint/compliance.js";
import { lintImageGuardrail } from "../lint/index.js";
import { placeholderHeroUrl } from "./placeholder.js";
import { prisma } from "../db.js";

const FOOTER_PLACEHOLDER = "FHA LLC, 123 Herb Lane, Portland OR 97201 (preview address — replace before sending)";

function isMock(reqMock: boolean | undefined): boolean {
  return reqMock === true || !process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY || !process.env.R2_ACCESS_KEY_ID;
}

export async function generateRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/generate", async (req: FastifyRequest, reply) => {
    const parsed = GenerateRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const { templateId, brand: brandSlug, brief, mock } = parsed.data;
    const mocking = isMock(mock);

    const brand = loadBrand(brandSlug);
    const template = loadTemplate(templateId);

    // 1. Copy — real Claude call, or canned mock when keys are absent.
    const copy = mocking ? mockCopy(brand, brief) : await generateEmailCopy(brand, brief);

    // 2. Compliance gate on the COPY — before any image spend.
    const copyText = [copy.headline, copy.body, copy.cta_text, copy.testimonial ?? ""].join(". ");
    const compliance = lintCompliance(copyText, { bannedTerms: brand.complianceBannedTerms });
    if (compliance.length) {
      return reply.code(422).send({ error: "Compliance gate failed", findings: compliance });
    }

    // 3. Real-person image guardrail on the brief — before any image spend.
    const guardrail = lintImageGuardrail({
      featuredPerson: brand.featuredPerson,
      prompt: copy.hero_image_brief,
    });
    if (guardrail.length) {
      return reply.code(422).send({ error: "Image guardrail blocked generation", findings: guardrail });
    }

    // 4. Image → bytes → R2 (real) or inline SVG placeholder (mock).
    const project = await prisma.project.create({
      data: {
        brandSlug: brand.slug,
        templateId: template.id,
        campaignType: template.campaignType,
        brief,
        html: "", // filled below once we have the image URL
      },
    });

    let url: string;
    let assetBytes: number | null = null;
    if (mocking) {
      url = placeholderHeroUrl(req);
    } else {
      const image = await getImageProvider().generate(copy.hero_image_brief, "1536x1024");
      const ext = image.contentType.split("/")[1] ?? "png";
      url = await uploadImage(`${brand.slug}/${project.id}/hero.${ext}`, image.bytes, image.contentType);
      assetBytes = image.bytes.length;
    }

    await prisma.projectAsset.create({
      data: { projectId: project.id, kind: "hero", url, prompt: copy.hero_image_brief, bytes: assetBytes },
    });

    // 5. Fill template → canonical HTML → persist.
    const values = buildFillValues({
      copy,
      brandName: brand.name,
      heroImageUrl: url,
      footerAddress: brand.footerAddress ?? FOOTER_PLACEHOLDER,
    });
    const html = fillTemplate(template.html, values);

    const updated = await prisma.project.update({ where: { id: project.id }, data: { html } });

    const res: GenerateResponse = { projectId: updated.id, html };
    return reply.send(res);
  });
}
