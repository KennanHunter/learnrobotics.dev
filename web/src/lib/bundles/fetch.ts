// Fetch the compressed bundle bytes. IndexedDB cache first, then the
// server-issued presigned R2 URL served via /api/bundles/<kind>/<pin>
// (a 302 to the long-TTL signed URL). Going through an API route keeps
// server-only modules (cloudflare:workers, R2 creds) out of the worker
// bundle, which is where this code runs.

import { readCached, writeCached } from "~/lib/bundles/cache";
import type { BundleManifestEntry } from "~/lib/bundles/manifest";

function bundleEndpoint(entry: BundleManifestEntry): string {
  return `/api/bundles/${encodeURIComponent(entry.kind)}/${encodeURIComponent(entry.pin)}`;
}

export type FetchOptions = {
  onProgress?: (received: number, total: number | null) => void;
};

async function readBody(
  resp: Response,
  onProgress: FetchOptions["onProgress"],
): Promise<Uint8Array> {
  const totalHeader = resp.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : null;
  if (!resp.body || !onProgress) {
    return new Uint8Array(await resp.arrayBuffer());
  }
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(received, total);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function fetchBundleBytes(
  entry: BundleManifestEntry,
  options?: FetchOptions,
): Promise<Uint8Array> {
  const cached = await readCached(entry.kind, entry.pin);
  if (cached) return cached;

  const resp = await fetch(bundleEndpoint(entry));
  if (!resp.ok) {
    throw new Error(
      `bundle fetch failed: ${resp.status} for ${entry.kind}/${entry.pin}`,
    );
  }
  const bytes = await readBody(resp, options?.onProgress);
  try {
    await writeCached(entry.kind, entry.pin, bytes);
  } catch (err) {
    // Non-fatal: the bundle still works this session, we just re-fetch next time.
    console.warn("runtime bundle cache write failed", err);
  }
  return bytes;
}
