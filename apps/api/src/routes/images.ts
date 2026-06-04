import type { FastifyInstance } from "fastify";
import { loadBrand } from "@loom/brand-data";
import { ImageRequest, type ImageResponse } from "@loom/shared";
import { getImageProvider } from "../ai/imageProvider/index.js";
import { uploadImage } from "../storage/r2.js";
import { lintImageGuardrail } from "../lint/index.js";

export async function imageRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/images", async (req, reply) => {
    const parsed = ImageRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const { prompt, brand: brandSlug, size, headshotUrl } = parsed.data;
    const brand = loadBrand(brandSlug);

    const guardrail = lintImageGuardrail({ featuredPerson: brand.featuredPerson, prompt, headshotUrl });
    if (guardrail.length) {
      return reply.code(422).send({ error: "Image guardrail blocked generation", findings: guardrail });
    }

    const image = await getImageProvider().generate(prompt, size);
    const ext = image.contentType.split("/")[1] ?? "png";
    const key = `${brand.slug}/adhoc/${Date.now()}.${ext}`;
    const url = await uploadImage(key, image.bytes, image.contentType);

    const res: ImageResponse = { url };
    return reply.send(res);
  });
}
