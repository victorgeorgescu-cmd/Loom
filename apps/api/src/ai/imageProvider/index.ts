import type { ImageSize } from "@loom/shared";

/**
 * Provider-agnostic image generation. v0 ships the OpenAI adapter; your TBD
 * service drops in behind the same interface without touching the pipeline.
 */
export interface GeneratedImage {
  bytes: Buffer;
  contentType: string; // e.g. "image/jpeg"
}

export interface ImageProvider {
  readonly name: string;
  generate(prompt: string, size: ImageSize): Promise<GeneratedImage>;
}

import { OpenAIImageProvider } from "./openai.js";

let provider: ImageProvider | null = null;
export function getImageProvider(): ImageProvider {
  if (!provider) provider = new OpenAIImageProvider();
  return provider;
}
