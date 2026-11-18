import { AwsClient } from "aws4fetch";
import { getEnv } from "./env";

// Add a new entry here to onboard a new artifact category. The kind is the
// unit of access control: callers name a kind, and bucket / prefix / allowed
// content types / public-vs-private are all implied by it. Public kinds hand
// out long-lived, cached presigned URLs (safe to embed in HTML); private
// kinds hand out short, fresh URLs per request.
const ARTIFACT_KINDS = {
  "wasm-bundle": {
    bucket: "learnrobotics-wasm",
    prefix: "bundles/",
    contentTypes: ["application/wasm"],
    maxBytes: 64 * 1024 * 1024,
    visibility: "public",
  },
  // Pinned Java dependency bundles (JDK, WPILib, façades) fed to ristretto
  // via the preopen filesystem. Keyed by `<kind>/<pin>/bundle.tar.gz` under
  // this prefix. Built + uploaded by the packages/bundling CLI.
  "runtime-bundle": {
    bucket: "learn-robotics-dev-storage",
    prefix: "bundles/",
    contentTypes: ["application/gzip"],
    maxBytes: 256 * 1024 * 1024,
    visibility: "public",
  },
} as const satisfies Record<string, ArtifactKindConfig>;

type ArtifactKindConfig = {
  bucket: string;
  prefix: string;
  contentTypes: readonly string[];
  maxBytes: number;
  visibility: "public" | "private";
};

export type ArtifactKind = keyof typeof ARTIFACT_KINDS;

type KindsWithVisibility<V extends "public" | "private"> = {
  [K in ArtifactKind]: (typeof ARTIFACT_KINDS)[K]["visibility"] extends V
    ? K
    : never;
}[ArtifactKind];

export type PublicArtifactKind = KindsWithVisibility<"public">;
export type PrivateArtifactKind = KindsWithVisibility<"private">;

export type ContentTypeFor<K extends ArtifactKind> =
  (typeof ARTIFACT_KINDS)[K]["contentTypes"][number];

const PUBLIC_DOWNLOAD_TTL_SECONDS = 24 * 60 * 60;
const PRIVATE_DOWNLOAD_DEFAULT_TTL_SECONDS = 300;
const UPLOAD_DEFAULT_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;
// Re-sign a cached public URL this many seconds before it actually expires so
// callers never get a URL that's about to die in flight.
const CACHE_REFRESH_MARGIN_SECONDS = 5 * 60;

type CachedUrl = { url: string; expiresAtMs: number };
const publicUrlCache = new Map<string, CachedUrl>();

function awsClient() {
  const env = getEnv();
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(bucket: string, prefix: string, key: string) {
  const env = getEnv();
  const safeKey = `${prefix}${key}`
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${safeKey}`,
  );
}

function clampTtl(seconds: number) {
  if (seconds <= 0 || seconds > MAX_TTL_SECONDS) {
    throw new Error(`ttl must be in (0, ${MAX_TTL_SECONDS}] seconds`);
  }
  return seconds;
}

async function signDownload(
  kind: ArtifactKind,
  key: string,
  ttlSeconds: number,
) {
  const cfg = ARTIFACT_KINDS[kind];
  const url = objectUrl(cfg.bucket, cfg.prefix, key);
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));
  const signed = await awsClient().sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function presignUpload<K extends ArtifactKind>(options: {
  kind: K;
  key: string;
  contentType: ContentTypeFor<K>;
  expiresInSeconds?: number;
}): Promise<string> {
  const cfg = ARTIFACT_KINDS[options.kind];
  if (!cfg.contentTypes.includes(options.contentType)) {
    throw new Error(
      `content-type ${options.contentType} not allowed for kind ${options.kind}`,
    );
  }
  const ttl = clampTtl(options.expiresInSeconds ?? UPLOAD_DEFAULT_TTL_SECONDS);
  const url = objectUrl(cfg.bucket, cfg.prefix, options.key);
  url.searchParams.set("X-Amz-Expires", String(ttl));

  const signed = await awsClient().sign(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": options.contentType },
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signed.url;
}

// Public downloads: long TTL, cached per-isolate. Call this for artifacts
// anyone can read (course assets, wasm bundles, lesson media). Not a security
// boundary — the URL still carries a signature — but if a public URL leaks,
// nothing worse happens than the object being public, which it already is.
export async function presignPublicDownload(
  kind: PublicArtifactKind,
  key: string,
): Promise<string> {
  const cacheKey = `${kind}:${key}`;
  const now = Date.now();
  const cached = publicUrlCache.get(cacheKey);
  if (
    cached &&
    cached.expiresAtMs - now > CACHE_REFRESH_MARGIN_SECONDS * 1000
  ) {
    return cached.url;
  }
  const url = await signDownload(kind, key, PUBLIC_DOWNLOAD_TTL_SECONDS);
  publicUrlCache.set(cacheKey, {
    url,
    expiresAtMs: now + PUBLIC_DOWNLOAD_TTL_SECONDS * 1000,
  });
  return url;
}

// Private downloads: short TTL, never cached. Each caller gets a fresh URL.
// Use for user-scoped artifacts or anything you'd gate behind auth.
export async function presignPrivateDownload(
  kind: PrivateArtifactKind,
  key: string,
  options?: { expiresInSeconds?: number },
): Promise<string> {
  const ttl = clampTtl(
    options?.expiresInSeconds ?? PRIVATE_DOWNLOAD_DEFAULT_TTL_SECONDS,
  );
  return signDownload(kind, key, ttl);
}

export function getArtifactKindConfig<K extends ArtifactKind>(
  kind: K,
): (typeof ARTIFACT_KINDS)[K] {
  return ARTIFACT_KINDS[kind];
}

export type R2Object = {
  key: string;
  size: number;
  lastModified: string | undefined;
  etag: string | undefined;
};

// Admin-only. Lists objects under a prefix in an arbitrary bucket; follows
// the ListObjectsV2 continuation tokens until exhausted. Prefer this over
// exposing the raw AWS client because it also encodes the account-id +
// signer convention our other helpers use.
export async function listBucketObjects(options: {
  bucket: string;
  prefix?: string;
}): Promise<R2Object[]> {
  const env = getEnv();
  const client = awsClient();
  const out: R2Object[] = [];
  let continuationToken: string | undefined;
  do {
    const url = new URL(
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${options.bucket}`,
    );
    url.searchParams.set("list-type", "2");
    if (options.prefix) url.searchParams.set("prefix", options.prefix);
    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }
    const resp = await client.fetch(url.toString());
    if (!resp.ok) {
      throw new Error(
        `List ${options.prefix ?? "/"} failed: HTTP ${resp.status} ${await resp.text()}`,
      );
    }
    const xml = await resp.text();
    for (const item of parseContents(xml)) out.push(item);
    continuationToken = tag(xml, "NextContinuationToken");
  } while (continuationToken);
  return out;
}

function parseContents(xml: string): R2Object[] {
  const items: R2Object[] = [];
  const re = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1]!;
    const key = tag(block, "Key");
    if (!key) continue;
    items.push({
      key,
      size: Number(tag(block, "Size") ?? "0"),
      lastModified: tag(block, "LastModified"),
      etag: tag(block, "ETag")?.replace(/^"|"$/g, ""),
    });
  }
  return items;
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
  return m ? m[1] : undefined;
}
