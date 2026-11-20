import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import type { Plugin } from "vite";

// `@learnrobotics/content` is a workspace package resolved via a pnpm
// symlink in `node_modules`. Vite's default watcher is scoped to the
// project root (`web/`), so edits to lesson .mdx / chapter / unit files
// under the real `/content` directory don't trigger HMR or re-run the
// `import.meta.glob` calls in `content/lib/index-builder.ts`. Add the
// content directory to chokidar explicitly.
export function watchContent(): Plugin {
  const here = dirname(fileURLToPath(import.meta.url));
  const contentDir = resolvePath(here, "../../content");
  return {
    name: "watch-content",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(contentDir);
    },
  };
}
