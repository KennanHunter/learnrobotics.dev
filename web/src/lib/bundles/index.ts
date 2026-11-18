import { logger } from "~/lib/logger";
import { fetchBundleBytes, type FetchOptions } from "~/lib/bundles/fetch";
import { BUNDLES, type BundleName } from "~/lib/bundles/manifest";
import { stagePreopen } from "~/lib/bundles/stage";
import { gunzip, parseTar } from "~/lib/bundles/tar";

export { BUNDLES } from "~/lib/bundles/manifest";
export type { BundleName } from "~/lib/bundles/manifest";

const log = logger.child({ scope: "bundles" });

export type EnsureBundleResult = {
  mountPath: string;
  classpath: string[];
};

const inflight = new Map<BundleName, Promise<EnsureBundleResult>>();

export function ensureBundle(
  name: BundleName,
  options?: FetchOptions,
): Promise<EnsureBundleResult> {
  const existing = inflight.get(name);
  if (existing) return existing;
  const p = (async () => {
    const entry = BUNDLES[name];
    const t0 = performance.now();
    log.info({ name, pin: entry.pin }, "fetching bundle");
    const compressed = await fetchBundleBytes(entry, options);
    log.info(
      {
        name,
        bytes: compressed.length,
        ms: Math.round(performance.now() - t0),
      },
      "bundle bytes ready",
    );

    const t1 = performance.now();
    const unpacked = await gunzip(compressed);
    const files = parseTar(unpacked);
    log.debug(
      {
        name,
        files: files.length,
        unpackedBytes: unpacked.length,
        ms: Math.round(performance.now() - t1),
      },
      "bundle extracted",
    );

    await stagePreopen(entry.mountPath, files);
    log.info({ name, mountPath: entry.mountPath }, "bundle staged");

    return {
      mountPath: entry.mountPath,
      classpath: entry.classpathJars.map((jar) => `${entry.mountPath}/${jar}`),
    };
  })();
  inflight.set(name, p);
  p.catch(() => inflight.delete(name));
  return p;
}
