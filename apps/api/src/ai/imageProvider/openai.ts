import OpenAI from "openai";
import type { ImageSize } from "@loom/shared";
import { config } from "../../config.js";
import type { GeneratedImage, ImageProvider } from "./index.js";

/**
 * OpenAI gpt-image adapter. GPT image models return base64 only (no URL), so
 * we decode to bytes and hand them to R2 — the same reason the old
 * gen_image.py existed. The model id is config-driven; do NOT hardcode an
 * unverified id, and note gpt-image models require OpenAI org verification
 * (403 otherwise).
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) this.client = new OpenAI({ apiKey: config.openai.apiKey });
    return this.client;
  }

  async generate(prompt: string, size: ImageSize): Promise<GeneratedImage> {
    let result;
    try {
      result = await this.getClient().images.generate({
        model: config.openai.imageModel,
        prompt,
        size,
        n: 1,
      });
    } catch (e) {
      const text = String(e).toLowerCase();
      if (text.includes("verify") || text.includes("403") || text.includes("organization")) {
        throw new Error(
          "Image generation failed: gpt-image models require OpenAI API Organization Verification. Complete it in the OpenAI console, then retry.",
        );
      }
      throw e;
    }

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data.");
    return { bytes: Buffer.from(b64, "base64"), contentType: "image/png" };
  }
}
