import { readFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import type { Plugin } from "vite";

const QUERY = "?raw";
const VIRTUAL_PREFIX = "\0virtual:md-raw:";

// Imports of `*.md?raw` resolve to a virtual module whose default export
// is the file's raw text. Vite's built-in `?raw` handling doesn't survive
// the Cloudflare worker env runner, so we route it through a `\0`-prefixed
// virtual module that no other plugin claims.
export function mdRaw(): Plugin {
  return {
    name: "md-raw",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.endsWith(".md" + QUERY)) return;
      const bare = source.slice(0, -QUERY.length);
      const abs = importer
        ? resolvePath(dirname(importer), bare)
        : resolvePath(bare);
      return VIRTUAL_PREFIX + abs;
    },
    async load(id: string) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return;
      const abs = id.slice(VIRTUAL_PREFIX.length);
      const src = await readFile(abs, "utf8");
      return `export default ${JSON.stringify(src)};`;
    },
  };
}
