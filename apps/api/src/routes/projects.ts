import type { FastifyInstance } from "fastify";
import { loadBrand, loadTemplate } from "@loom/brand-data";
import { ProjectUpdate } from "@loom/shared";
import { prisma } from "../db.js";
import { runExportGates, runSaveGates } from "../lint/index.js";

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id }, include: { assets: true } });
    if (!project) return reply.code(404).send({ error: "Not found" });
    return reply.send(project);
  });

  // Save canonical HTML. Runs the lighter save-time gate set (compliance +
  // AC-tag survival + structure) so the editor can surface problems live.
  app.put("/api/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = ProjectUpdate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Not found" });

    const brand = loadBrand(existing.brandSlug);
    const template = loadTemplate(existing.templateId);
    const report = runSaveGates(parsed.data.html, {
      bannedTerms: brand.complianceBannedTerms,
      templateHtml: template.html,
    });

    const updated = await prisma.project.update({
      where: { id },
      data: { html: parsed.data.html, status: parsed.data.status ?? existing.status },
    });
    return reply.send({ project: updated, lint: report });
  });

  // Export — runs the FULL gate set. Blocks (409) on any error-severity finding.
  app.get("/api/projects/:id/export", async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.code(404).send({ error: "Not found" });

    const brand = loadBrand(project.brandSlug);
    const template = loadTemplate(project.templateId);
    const report = runExportGates(project.html, {
      bannedTerms: brand.complianceBannedTerms,
      templateHtml: template.html,
    });

    if (!report.ok) {
      return reply.code(409).send({ error: "Export blocked by gates", lint: report });
    }
    return reply.header("content-type", "text/html; charset=utf-8").send(project.html);
  });
}
