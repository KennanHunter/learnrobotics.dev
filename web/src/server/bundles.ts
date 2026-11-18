import { createServerFn } from "@tanstack/solid-start";
import { requireAdmin } from "@learnrobotics/db/data";
import { listBucketObjects, type R2Object } from "~/server/r2";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "admin-bundles" });

// R2 bundle inventory. Each prefix below corresponds to a kind of artifact
// we host — teavm is flat-file-per-pin (legacy layout), runtime-bundle
// is single-tar-per-pin. Both live in `learn-robotics-dev-storage`.
const BUNDLE_SOURCES = [
  { label: "teavm", bucket: "learn-robotics-dev-storage", prefix: "teavm/" },
  {
    label: "runtime-bundle",
    bucket: "learn-robotics-dev-storage",
    prefix: "bundles/",
  },
] as const;

export type BundleObject = R2Object & {
  source: string;
  kind: string;
  pin: string;
  filename: string;
};

export type BundleInventory = {
  sources: {
    label: string;
    bucket: string;
    prefix: string;
    objects: BundleObject[];
    error?: string;
  }[];
};

function parseKey(
  prefix: string,
  key: string,
): { kind: string; pin: string; filename: string } {
  // Expect prefix + "<kind>/<pin>/<filename>" OR prefix + "<pin>/<filename>" (teavm).
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const parts = rest.split("/");
  if (parts.length >= 3) {
    return {
      kind: parts[0] ?? "",
      pin: parts[1] ?? "",
      filename: parts.slice(2).join("/"),
    };
  }
  if (parts.length === 2) {
    // Legacy teavm shape: prefix="teavm/" → rest="<pin>/<file>"
    return {
      kind: prefix.replace(/\/+$/, ""),
      pin: parts[0] ?? "",
      filename: parts[1] ?? "",
    };
  }
  return { kind: "", pin: "", filename: rest };
}

export const listBundles = createServerFn({ method: "GET" }).handler(
  async (): Promise<BundleInventory> => {
    await requireAdmin();
    const sources = await Promise.all(
      BUNDLE_SOURCES.map(async (src) => {
        try {
          const raw = await listBucketObjects({
            bucket: src.bucket,
            prefix: src.prefix,
          });
          const objects = raw.map((obj) => ({
            ...obj,
            source: src.label,
            ...parseKey(src.prefix, obj.key),
          }));
          return { ...src, objects };
        } catch (err) {
          log.warn(
            {
              source: src.label,
              err: err instanceof Error ? err.message : String(err),
            },
            "listBundles: source failed",
          );
          return {
            ...src,
            objects: [] as BundleObject[],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    return { sources };
  },
);
