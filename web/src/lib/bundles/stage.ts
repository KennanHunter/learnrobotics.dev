// Convert the flat {path, bytes}[] from the tar into the nested `fileData`
// tree preview2-shim's InMemoryFilesystemAdapter expects, then wire it in as
// a preopen at the bundle's mount path. The adapter is the thing ristretto's
// wasi:filesystem calls resolve against — writing here is how ristretto
// "sees" the JDK on disk.

import type { TarFile } from "~/lib/bundles/tar";

type FileData = { source: Uint8Array };
type DirData = { dir: Record<string, FileData | DirData> };
type FsNode = FileData | DirData;

function emptyDir(): DirData {
  return { dir: {} };
}

function placeFile(root: DirData, pathParts: string[], bytes: Uint8Array) {
  let node: DirData = root;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const seg = pathParts[i];
    if (!seg) continue;
    const existing = node.dir[seg];
    if (existing && "dir" in existing) {
      node = existing;
    } else {
      const next = emptyDir();
      node.dir[seg] = next;
      node = next;
    }
  }
  const leaf = pathParts[pathParts.length - 1];
  if (!leaf) return;
  node.dir[leaf] = { source: bytes };
}

function buildTree(files: TarFile[]): DirData {
  const root = emptyDir();
  for (const { path, bytes } of files) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    placeFile(root, parts, bytes);
  }
  return root;
}

const staged = new Set<string>();

/** Mount an already-extracted tar as a preopen in the WASI virtual FS. */
export async function stagePreopen(
  mountPath: string,
  files: TarFile[],
): Promise<void> {
  if (staged.has(mountPath)) return;
  const tree = buildTree(files);
  const { _addPreopen } =
    (await import("@bytecodealliance/preview2-shim/filesystem")) as unknown as {
      _addPreopen: (path: string, data: FsNode) => void;
    };
  _addPreopen(mountPath, tree);
  staged.add(mountPath);
}

/** For tests: forget prior stagings so a fresh module graph can re-stage. */
export function _resetStaged(): void {
  staged.clear();
}
