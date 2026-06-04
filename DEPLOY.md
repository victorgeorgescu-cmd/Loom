# Deploying Loom to Railway

Railway builds from this GitHub branch in the cloud — no local Node/pnpm
needed. v0 deploys the **API + Postgres**. (The web editor is M2; until then
the web app is a placeholder, so it isn't wired into the deploy yet.)

## One-time setup

1. **Create the project from GitHub**
   - Railway → **New Project** → **Deploy from GitHub repo**.
   - Pick `victorgeorgescu-cmd/loom`, branch **`claude/nice-johnson-1JDrn`**.
   - Railway detects `railway.json` and configures build/start automatically.

2. **Add Postgres**
   - In the project: **New** → **Database** → **PostgreSQL**.
   - This creates a `Postgres` service exposing `DATABASE_URL`.

3. **Set variables on the API service** (the service named after the repo)
   - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`  ← reference, not a literal
   - `ANTHROPIC_API_KEY` → your key (placeholder ok to boot)
   - `ANTHROPIC_MODEL` → `claude-sonnet-4-6`
   - `OPENAI_API_KEY` → your key (placeholder ok to boot)
   - `IMAGE_MODEL` → the image model your OpenAI org is verified for (e.g. `gpt-image-1`)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
   - Do **not** set `PORT` — Railway injects it and the app binds it.

   The app boots and serves with placeholder AI/R2 keys; those are only
   exercised when you call `/api/generate` or `/api/images`.

4. **Expose it**
   - API service → **Settings** → **Networking** → **Generate Domain**.

## What happens on deploy

- Build: `pnpm install` (Nixpacks) → `prisma generate`.
- Start: `prisma migrate deploy` (applies `0001_init`) → `tsx src/index.ts`,
  which seeds brands + the template and starts Fastify.
- Health check: Railway polls `/api/health`.

## Verify

```
GET https://<your-domain>/api/health      ->  {"ok":true}
```

Once real keys are set, generate an email:

```
POST https://<your-domain>/api/generate
Content-Type: application/json

{ "templateId": "sales-single-hero", "brand": "fha", "brief": "spring remedy bundle, dried herbs and amber bottles" }
```

## Notes

- Migrations run on every deploy/restart (idempotent).
- Production runs TypeScript directly via `tsx` (workspace packages are TS
  source); there is no separate compile step to maintain.
- `R2_PUBLIC_BASE_URL` must be a custom domain for real sends — r2.dev is
  rate-limited and not for production.
