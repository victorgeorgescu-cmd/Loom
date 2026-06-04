import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { seed } from "./seed.js";
import { generateRoutes } from "./routes/generate.js";
import { imageRoutes } from "./routes/images.js";
import { projectRoutes } from "./routes/projects.js";
import { placeholderRoutes } from "./routes/placeholder.js";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));
  app.get("/api/health", async () => ({ ok: true }));

  await app.register(generateRoutes);
  await app.register(imageRoutes);
  await app.register(projectRoutes);
  await app.register(placeholderRoutes);

  try {
    await seed();
    app.log.info("seeded brands + templates");
  } catch (e) {
    app.log.warn({ err: e }, "seed skipped (is DATABASE_URL set and migrated?)");
  }

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
