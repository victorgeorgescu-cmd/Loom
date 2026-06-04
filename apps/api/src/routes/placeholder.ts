import type { FastifyInstance } from "fastify";

/**
 * Inline SVG hero placeholder used by mock generation when no R2 is wired.
 * Stays under 2KB so it never trips the 102KB Gmail weight gate even with the
 * full email scaffold around it.
 */
const HERO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" width="1536" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a2c1a"/>
      <stop offset="100%" stop-color="#8a5a3a"/>
    </linearGradient>
  </defs>
  <rect width="1536" height="1024" fill="url(#bg)"/>
  <g fill="#f4f4f0" font-family="Georgia, serif" text-anchor="middle">
    <text x="768" y="500" font-size="64">Loom · placeholder hero</text>
    <text x="768" y="580" font-size="28" opacity="0.8">Wire OPENAI_API_KEY + R2 to replace with a generated image</text>
  </g>
</svg>`;

export async function placeholderRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/placeholder/hero.svg", async (_req, reply) => {
    return reply
      .header("content-type", "image/svg+xml; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(HERO_SVG);
  });
}

/** Absolute URL for the placeholder, built from the request — works on any host. */
export function placeholderHeroUrl(req: { protocol: string; hostname: string; headers: Record<string, unknown> }): string {
  const host = (req.headers["x-forwarded-host"] as string) ?? req.hostname;
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol;
  return `${proto}://${host}/api/placeholder/hero.svg`;
}
