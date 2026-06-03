#!/usr/bin/env python3
"""
gen_image.py — Generate an image with OpenAI's GPT image models and return a HOSTED URL.

Why this exists:
  GPT image models (gpt-image-1 / 1.5 / 2 ...) return base64 only — there is no URL response
  format. An email must reference a hosted image, not inline base64 (base64 bloats the HTML,
  Gmail clips past ~102KB, and it tanks deliverability). So this script:
      1. generates the image (base64)
      2. decodes it to bytes
      3. uploads it to an image host (Cloudinary by default)
      4. prints JSON with the hosted URL to stdout

Usage:
  python scripts/gen_image.py --brand fha \
      --prompt "vintage apothecary still life, dried herbs and amber glass bottles..." \
      --size 1536x1024 --format jpeg --out spring_bundle_hero

Output (stdout, JSON):
  {"url": "...", "local_path": "...", "hosted": true, "model": "gpt-image-2",
   "size": "1536x1024", "bytes": 184213}

Env (.env):
  OPENAI_API_KEY=sk-...
  IMAGE_MODEL=gpt-image-2          # optional, default below
  IMAGE_HOST=cloudinary            # cloudinary | local
  CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
"""

import argparse
import base64
import json
import os
import sys
from datetime import date
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional if env vars are already set

DEFAULT_MODEL = os.getenv("IMAGE_MODEL", "gpt-image-2")
DEFAULT_HOST = os.getenv("IMAGE_HOST", "cloudinary")
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output" / "_images"


def die(msg: str, code: int = 1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def generate(prompt: str, model: str, size: str, quality: str, fmt: str) -> bytes:
    try:
        from openai import OpenAI
    except ImportError:
        die("openai SDK not installed. Run: pip install -r scripts/requirements.txt")

    if not os.getenv("OPENAI_API_KEY"):
        die("OPENAI_API_KEY is not set (put it in .env).")

    client = OpenAI()
    try:
        result = client.images.generate(
            model=model,
            prompt=prompt,
            size=size,
            quality=quality,
            output_format=fmt,
            n=1,
        )
    except Exception as e:
        hint = ""
        text = str(e).lower()
        if "verify" in text or "403" in text or "organization" in text:
            hint = ("\nHINT: GPT image models require API Organization Verification. "
                    "Complete it in the OpenAI developer console, then retry.")
        die(f"Image generation failed: {e}{hint}")

    b64 = result.data[0].b64_json
    if not b64:
        die("No image data returned (the model returned an empty result).")
    return base64.b64decode(b64)


def save_local(img: bytes, stem: str, fmt: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{stem}.{fmt}"
    path.write_bytes(img)
    return path


def upload_cloudinary(local_path: Path, brand: str, stem: str) -> str | None:
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError:
        print("cloudinary SDK not installed; falling back to local.", file=sys.stderr)
        return None
    if not os.getenv("CLOUDINARY_URL"):
        print("CLOUDINARY_URL not set; falling back to local.", file=sys.stderr)
        return None
    try:
        cloudinary.config(secure=True)  # auto-reads CLOUDINARY_URL
        resp = cloudinary.uploader.upload(
            str(local_path),
            folder=f"email/{brand}",
            public_id=stem,
            overwrite=True,
            resource_type="image",
        )
        return resp["secure_url"]
    except Exception as e:
        print(f"Cloudinary upload failed ({e}); falling back to local.", file=sys.stderr)
        return None


def main():
    p = argparse.ArgumentParser(description="Generate an image and return a hosted URL.")
    p.add_argument("--prompt", required=True, help="Full image prompt (text-free, logo-free).")
    p.add_argument("--brand", default="misc", help="Brand slug, used for foldering/public_id.")
    p.add_argument("--out", default=None, help="Output filename stem (no extension).")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--size", default="1536x1024",
                   help="WxH. gpt-image-1.x: 1024x1024|1024x1536|1536x1024. gpt-image-2: arbitrary.")
    p.add_argument("--quality", default="high", choices=["low", "medium", "high"])
    p.add_argument("--format", dest="fmt", default="jpeg", choices=["png", "jpeg", "webp"])
    p.add_argument("--host", default=DEFAULT_HOST, choices=["cloudinary", "local"])
    args = p.parse_args()

    stem = args.out or f"{args.brand}_{date.today().isoformat()}"

    img = generate(args.prompt, args.model, args.size, args.quality, args.fmt)
    local_path = save_local(img, stem, args.fmt)

    url, hosted = None, False
    if args.host == "cloudinary":
        url = upload_cloudinary(local_path, args.brand, stem)
        hosted = url is not None
    if not hosted:
        url = local_path.as_uri()  # file:// placeholder; MUST be hosted before sending

    print(json.dumps({
        "url": url,
        "local_path": str(local_path),
        "hosted": hosted,
        "model": args.model,
        "size": args.size,
        "bytes": len(img),
    }))


if __name__ == "__main__":
    main()
