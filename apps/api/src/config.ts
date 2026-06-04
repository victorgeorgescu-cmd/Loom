/**
 * Central env access. Secrets are read lazily and only asserted at the point
 * of use, so the server (and the linters/tests) boot fine without them — the
 * live AI/storage smoke tests are the only things that require real keys.
 */
export const config = {
  port: Number(process.env.PORT ?? 8787),

  anthropic: {
    get apiKey() {
      return required("ANTHROPIC_API_KEY");
    },
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  },

  openai: {
    get apiKey() {
      return required("OPENAI_API_KEY");
    },
    // Default to a confirmed-live id. Do NOT assume gpt-image-2 exists.
    imageModel: process.env.IMAGE_MODEL ?? "gpt-image-1",
  },

  r2: {
    get accountId() {
      return required("R2_ACCOUNT_ID");
    },
    get accessKeyId() {
      return required("R2_ACCESS_KEY_ID");
    },
    get secretAccessKey() {
      return required("R2_SECRET_ACCESS_KEY");
    },
    get bucket() {
      return required("R2_BUCKET");
    },
    get publicBaseUrl() {
      return required("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
    },
  },
} as const;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
