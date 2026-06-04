import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

/**
 * Cloudflare R2 (S3-compatible) image host. Replaces the old Cloudinary path.
 * R2 is dumb object storage — no on-the-fly transforms — so we set the right
 * Content-Type and a long Cache-Control here, and serve via a custom domain
 * (R2_PUBLIC_BASE_URL). r2.dev is rate-limited and not for production sends.
 */
let s3: S3Client | null = null;
function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3;
}

export async function uploadImage(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${config.r2.publicBaseUrl}/${key}`;
}
