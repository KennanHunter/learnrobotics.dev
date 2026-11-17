// Shared R2 helpers for the Node-side bundle scripts. The Workers runtime
// has its own cred source (`cloudflare:workers` env) and keeps its own
// `awsClient()` in web/src/server/r2.ts — the two can't collapse because
// the dev-vars loader uses node:fs.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AwsClient } from "aws4fetch";
import { R2_BUCKET, r2Endpoint } from "./key.mjs";

export function repoRoot() {
  // packages/bundling/src/r2.mjs → repo root is 3 levels up.
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

/** Load R2 credentials from env or web/.dev.vars. */
export function readR2Credentials() {
  if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    };
  }

  const devVars = join(repoRoot(), "web", ".dev.vars");
  if (!existsSync(devVars)) {
    throw new Error(
      `R2 credentials not found. Set R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in env or ${devVars}.`,
    );
  }

  const vars = {};
  for (const line of readFileSync(devVars, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[m[1]] = value;
  }
  if (!vars.R2_ACCESS_KEY_ID || !vars.R2_SECRET_ACCESS_KEY) {
    throw new Error(
      `R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing from ${devVars}.`,
    );
  }
  return {
    accessKeyId: vars.R2_ACCESS_KEY_ID,
    secretAccessKey: vars.R2_SECRET_ACCESS_KEY,
  };
}

export function awsFromEnvOrDevVars() {
  const creds = readR2Credentials();
  return new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export function objectUrl({ bucket = R2_BUCKET, key }) {
  const safeKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${r2Endpoint()}/${bucket}/${safeKey}`;
}

/** PUT bytes at `key` only if the object doesn't already exist. Returns
 *  `{ uploaded: boolean, status, sha256 }`. */
export async function putIfMissing({
  aws,
  bucket = R2_BUCKET,
  key,
  bytes,
  contentType = "application/octet-stream",
  sha256,
}) {
  const url = objectUrl({ bucket, key });
  const head = await aws.fetch(url, { method: "HEAD" });
  if (head.ok) return { uploaded: false, status: 200 };

  const headers = { "content-type": contentType };
  if (sha256) headers["x-amz-meta-sha256"] = sha256;

  const put = await aws.fetch(url, {
    method: "PUT",
    body: bytes,
    headers,
  });
  if (!put.ok) {
    const body = await put.text();
    throw new Error(`PUT ${key} failed: HTTP ${put.status} ${body}`);
  }
  return { uploaded: true, status: put.status, sha256 };
}

/** Signed GET for a single object. */
export async function fetchObject({ aws, bucket = R2_BUCKET, key }) {
  const url = objectUrl({ bucket, key });
  const resp = await aws.fetch(url);
  if (!resp.ok) {
    throw new Error(`GET ${key} failed: HTTP ${resp.status}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

/** ListObjectsV2 under a prefix. Returns `[{ key, size, lastModified, etag }]`.
 *  Pagination is followed until exhausted — the bundle namespace is small. */
export async function listObjects({ aws, bucket = R2_BUCKET, prefix = "" }) {
  const out = [];
  let continuationToken;
  do {
    const url = new URL(`${r2Endpoint()}/${bucket}`);
    url.searchParams.set("list-type", "2");
    if (prefix) url.searchParams.set("prefix", prefix);
    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }
    const resp = await aws.fetch(url.toString());
    if (!resp.ok) {
      throw new Error(
        `List ${prefix} failed: HTTP ${resp.status} ${await resp.text()}`,
      );
    }
    const xml = await resp.text();
    for (const item of extractContents(xml)) out.push(item);
    continuationToken = extractTag(xml, "NextContinuationToken");
  } while (continuationToken);
  return out;
}

function extractContents(xml) {
  const items = [];
  const re = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const key = extractTag(block, "Key");
    const size = Number(extractTag(block, "Size") ?? "0");
    const lastModified = extractTag(block, "LastModified");
    const etag = (extractTag(block, "ETag") ?? "").replace(/^"|"$/g, "");
    if (key) items.push({ key, size, lastModified, etag });
  }
  return items;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1] : undefined;
}
