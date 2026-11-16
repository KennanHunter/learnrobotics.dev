# Agent guide: fork solid-icons as a TSX-only git dep

## Why

`solid-icons` ships compiled `.jsx` templates. Vite 8's SSR dep-optimizer prebundles them with esbuild's default (React) JSX transform, which injects `import { jsx } from 'react/jsx-runtime'` — the Cloudflare Workers runtime then 500s on missing React. The optimizer runs before plugins, so `vite-plugin-solid` can't rescue the files, and the per-environment knobs don't reach the Workers SSR env in our plugin combo (Vite 8 + `@cloudflare/vite-plugin` 1.69 + `vite-plugin-solid` 2.11).

The fix: a **fork that ships plain TSX source**, consumed via **pnpm git import**. Our Vite+Solid pipeline transforms the files on the fly, same as any `.tsx` in this repo. No prebundle, no React JSX leak, no build step in the fork.

We only use Material Design (`md`) and Ant Icons (`ai`), so the fork drops the other 15 packs.

## Target end state

- Standalone fork repo (e.g. `KennanHunter/solid-icons-solid`) that is **source-only**: TSX files committed, no `dist/`, no `prepare` script.
- `web/package.json` depends on it via `"solid-icons": "github:KennanHunter/solid-icons-solid#<sha>"`.
- Vite is told not to prebundle it, so `vite-plugin-solid` sees the `.tsx` at request time.

## Step 1 — set up the fork

```bash
# Human step: fork x64Bits/solid-icons on GitHub, then clone it somewhere outside this repo.
git clone git@github.com:<user>/solid-icons.git ~/src/solid-icons
cd ~/src/solid-icons
git checkout -b solid-tsx-only
```

Replace the whole package with a minimal source-only layout:

```
solid-icons-fork/
  package.json
  README.md
  src/
    IconBase.tsx
    md/
      index.ts
      <PerIcon>.tsx
    ai/
      index.ts
      <PerIcon>.tsx
  scripts/
    port.mjs                # kept so future refreshes are mechanical
```

Delete everything else from the upstream repo: `lib/`, old `dist/`, other pack folders, the upstream build scripts, `.github/`, `rollup.config.*`, etc. Keep the LICENSE (attribution — upstream is MIT).

`package.json`:

```json
{
  "name": "solid-icons",
  "version": "0.0.0-fork",
  "type": "module",
  "sideEffects": false,
  "files": ["src"],
  "exports": {
    "./md": {
      "solid": "./src/md/index.ts",
      "default": "./src/md/index.ts"
    },
    "./ai": {
      "solid": "./src/ai/index.ts",
      "default": "./src/ai/index.ts"
    }
  },
  "peerDependencies": {
    "solid-js": "^1.9.0"
  }
}
```

Points to note:

- **No `main`**, no `types`, no `build`/`prepare` scripts. pnpm's git installer won't run anything; it just checks out the files listed in `files`.
- Keeping the name `solid-icons` means consumer imports stay as `solid-icons/md`, `solid-icons/ai` — no code changes beyond the lockfile.
- `"solid"` condition is listed so `vite-plugin-solid` picks the TSX source. Fallback `"default"` points at the same file so other tooling behaves.

## Step 2 — write `IconBase.tsx` in the fork

```tsx
// src/IconBase.tsx
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

export type IconProps = JSX.SvgSVGAttributes<SVGSVGElement> & {
  size?: number | string;
  title?: string;
};

export type IconData = {
  attrs: JSX.SvgSVGAttributes<SVGSVGElement>;
  body: string; // raw inner SVG markup
};

export function IconBase(props: IconProps & { data: IconData }): JSX.Element {
  const [local, rest] = splitProps(props, ["size", "title", "data", "color"]);
  const html = () =>
    local.title
      ? `${local.data.body}<title>${local.title}</title>`
      : local.data.body;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      {...local.data.attrs}
      width={local.size ?? "1em"}
      height={local.size ?? "1em"}
      fill={local.color ?? "currentColor"}
      style={{ overflow: "visible" }}
      {...rest}
      innerHTML={html()}
    />
  );
}
```

`innerHTML` is the same trick upstream uses — lets us paste raw `<path>` strings without re-parsing.

## Step 3 — port the `md` and `ai` packs with a one-shot script

Upstream prebuilt output is one-liner per icon:

```js
export function MdLightMode(props) {
  return IconTemplate(
    { a: { viewBox: "0 0 24 24" }, c: '<path d="…"/>' },
    props,
  );
}
```

We regex-extract and emit one TSX per icon. Add `scripts/port.mjs` to the fork:

```js
// node scripts/port.mjs md /path/to/upstream/node_modules/solid-icons/md/index.js
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [pack, srcJs] = process.argv.slice(2);
if (!pack || !srcJs)
  throw new Error("usage: port.mjs <pack> <path-to-upstream-index.js>");

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, `../src/${pack}`);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const text = readFileSync(srcJs, "utf8");
const re =
  /export function (\w+)\(props\)\{return IconTemplate\((\{a:\{[^}]*\},c:'[^']*'\})/g;

const names = [];
for (const m of text.matchAll(re)) {
  const [, name, data] = m;
  names.push(name);
  const { a: attrs, c: body } = new Function(`return (${data});`)();
  const tsx = `import type { JSX } from "solid-js";
import { IconBase, type IconProps } from "../IconBase";

export function ${name}(props: IconProps): JSX.Element {
  return (
    <IconBase
      {...props}
      data={${JSON.stringify({ attrs, body })}}
    />
  );
}
`;
  writeFileSync(resolve(outDir, `${name}.tsx`), tsx);
}

writeFileSync(
  resolve(outDir, "index.ts"),
  names.map((n) => `export { ${n} } from "./${n}";`).join("\n") + "\n",
);
console.log(`${pack}: wrote ${names.length} icons`);
```

Run it with the upstream package as the data source. Easiest: install upstream into the fork temporarily just for this step.

```bash
cd ~/src/solid-icons
pnpm add -D solid-icons@1.2.0
node scripts/port.mjs md node_modules/solid-icons/md/index.js
node scripts/port.mjs ai node_modules/solid-icons/ai/index.js
pnpm remove solid-icons
```

Spot-check: open a couple of random `.tsx` under `src/md/`. They should be well-formed Solid components with a `data={…}` object literal.

Commit and push:

```bash
git add -A
git commit -m "Fork solid-icons: source-only TSX for md + ai"
git push -u origin solid-tsx-only
```

Note the commit SHA — we'll pin to it.

## Step 4 — swap the dep in `web/`

In `web/package.json`, replace the upstream line with a git ref pinned by SHA (branches move; SHAs don't):

```json
{
  "dependencies": {
    "solid-icons": "github:<user>/solid-icons#<sha>"
  }
}
```

Then:

```bash
cd web
pnpm install
rm -rf node_modules/.vite .vite
```

If pnpm is on Corepack and complains about the git URL shape, use the explicit form `git+https://github.com/<user>/solid-icons.git#<sha>`.

## Step 5 — tell Vite not to prebundle the fork

In `web/vite.config.ts` add:

```ts
export default defineConfig({
  // …existing config…
  optimizeDeps: {
    exclude: ["solid-icons", "solid-icons/md", "solid-icons/ai"],
  },
  ssr: {
    noExternal: ["solid-icons"],
  },
  environments: {
    ssr: {
      optimizeDeps: {
        exclude: ["solid-icons", "solid-icons/md", "solid-icons/ai"],
      },
    },
  },
});
```

Why each line:

- `optimizeDeps.exclude` — stops the client-side dep-optimizer from touching the TSX.
- `environments.ssr.optimizeDeps.exclude` — same for the Workers SSR env (where the original crash was).
- `ssr.noExternal` — forces Vite to run the files through its plugin pipeline (so `vite-plugin-solid` transforms the TSX) rather than externalizing them to the Workers runtime as bare imports.

Also make sure `vite-plugin-solid`'s `include` reaches node_modules TSX. The default regex covers it, but if you've customized it, add `/node_modules\/solid-icons\//`.

## Step 6 — consumer imports

`web/src/components/ThemeToggle.tsx` is already right:

```ts
import { MdLightMode, MdDarkMode } from "solid-icons/md";
```

`web/src/components/TopBar.tsx` currently uses `FaBrandsGithub` from `solid-icons/fa` — that pack no longer exists. Options:

1. Use `MdGitHub` from the ported `md` pack if present. Check with `ls packages/.../src/md/MdGitHub.tsx` in the fork output, or `grep -l MdGitHub src/md/` inside the fork.
2. If not present, hand-add a single `src/FaBrandsGithub.tsx` to the fork and expose it via a root `./github` export in the fork's `package.json` `exports`. Keep this to a minimum — one-off icons only.

Keep `AiOutlineInfoCircle` as-is; it lives in the `ai` pack.

## Step 7 — verify

```bash
cd web
pnpm dev
```

Open the index in a browser. Confirm:

- Theme toggle shows sun/moon.
- GitHub button shows the chosen GitHub mark.
- Info icon renders with tooltip.
- No `react/jsx-runtime` error.

Build check:

```bash
pnpm build
```

Tree-shaking: the output bundle should contain only the four icons imported, not the full pack. Spot-check with `grep -c MdLightMode dist/**/*.js`.

## Maintenance

- **New icon used in app**: just import it. Vite resolves it from the fork at dev time.
- **Fork out of date with upstream**: `cd ~/src/solid-icons`, `git fetch upstream && git merge upstream/main`, `pnpm add -D solid-icons@latest`, rerun `scripts/port.mjs` for each pack, commit, push, bump the SHA pin in `web/package.json`.
- **Need another pack**: in the fork, `node scripts/port.mjs <pack> …`, add the `exports` entry, commit, repin SHA here. Don't add packs speculatively.

## Non-goals

- Don't add a build step to the fork. The whole point is shipping TSX.
- Don't publish to npm. Git dep is enough and keeps the pin honest.
- Don't hand-edit ported icon files. The script owns their shape.
