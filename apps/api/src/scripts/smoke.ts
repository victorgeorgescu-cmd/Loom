/**
 * Live spine smoke test — requires real ANTHROPIC_API_KEY, OPENAI_API_KEY
 * (org-verified), and R2 creds. Runs the secret-dependent half of the pipeline
 * end to end and prints the hosted image URL. Run with: pnpm --filter @loom/api smoke
 */
import { loadBrand, loadTemplate } from "@loom/brand-data";
import { generateEmailCopy } from "../ai/anthropic.js";
import { getImageProvider } from "../ai/imageProvider/index.js";
import { uploadImage } from "../storage/r2.js";
import { buildFillValues, fillTemplate } from "../html/fill.js";
import { runExportGates } from "../lint/index.js";

async function main() {
  const brand = loadBrand("fha");
  const template = loadTemplate("sales-single-hero");
  const brief = "spring remedy bundle, dried herbs and amber bottles";

  console.log("→ generating copy…");
  const copy = await generateEmailCopy(brand, brief);
  console.log("  headline:", copy.headline);

  console.log("→ generating image…");
  const image = await getImageProvider().generate(copy.hero_image_brief, "1536x1024");

  console.log("→ uploading to R2…");
  const url = await uploadImage(`fha/smoke/hero.${image.contentType.split("/")[1]}`, image.bytes, image.contentType);
  console.log("  hosted url:", url);

  const html = fillTemplate(
    template.html,
    buildFillValues({
      copy,
      brandName: brand.name,
      heroImageUrl: url,
      footerAddress: brand.footerAddress ?? "FHA LLC, <ADDRESS NEEDED>",
    }),
  );

  const report = runExportGates(html, {
    bannedTerms: brand.complianceBannedTerms,
    templateHtml: template.html,
  });
  console.log("→ export gates:", report.ok ? "PASS" : "BLOCKED");
  for (const f of report.findings) console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
