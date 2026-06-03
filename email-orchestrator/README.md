# Email Production Orchestrator (Claude Code)

Turns a one-line request into an ActiveCampaign-ready HTML email, generating hosted images on the way.

## How it works
`CLAUDE.md` is the orchestrator. It routes a request to a brand in `brands/`, loads that brand's
`context.md` + `style.md`, delegates HTML construction to the `email-template-design` skill, and
calls `scripts/gen_image.py` for any imagery (returning a hosted URL, never base64).

## Setup
1. `pip install -r scripts/requirements.txt`
2. `cp .env.example .env` and fill in `OPENAI_API_KEY` and `CLOUDINARY_URL`.
   - GPT image models need API Organization Verification in the OpenAI console first.
3. Make sure the `email-template-design` skill is available to Claude Code.

## Use
Open this folder in Claude Code and say, e.g.:
> "FHA sales email about the spring remedy bundle, hero image of dried herbs and amber bottles."

Claude reads the brand files, generates the image via the script, writes the HTML to `output/`,
and runs the deliverability checklist.

## Add a brand
`cp -r brands/_TEMPLATE brands/<slug>` and fill in both files. No code changes needed.

## Image host
Default is Cloudinary (set `CLOUDINARY_URL`). To swap to S3/other, replace `upload_cloudinary()`
in `scripts/gen_image.py`. With no host configured, images save locally and are flagged as
needing upload before send.
