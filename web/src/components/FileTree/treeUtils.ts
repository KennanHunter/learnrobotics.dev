import { TreeNode } from "./types";

export function generateDirectoryTree(
  entries: string[] = [],
  root = "root",
): TreeNode {
  const sorted = [...entries].sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    if (al < bl) return -1;
    if (al > bl) return 1;
    return 0;
  });

  let currentKey = 1;
  const rootNode = new TreeNode(`${currentKey}`, root, true, null);

  // Create folders first.
  for (const pathStr of sorted) {
    const parts = pathStr.split("/");
    let current = rootNode;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      let child = current.children.find((c) => c.name === name);
      if (child === undefined && i < parts.length - 1) {
        currentKey += 1;
        child = new TreeNode(`${currentKey}`, name, true, current);
        current.children.push(child);
      }
      if (child) current = child;
    }
  }

  // Now create files.
  for (const pathStr of sorted) {
    const parts = pathStr.split("/");
    let current = rootNode;

    if (parts.length === 1) {
      currentKey += 1;
      current.children.push(
        new TreeNode(`${currentKey}`, parts[0], false, current),
      );
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const child = current.children.find((c) => c.name === name);
      if (child === undefined && isLast) {
        currentKey += 1;
        current.children.push(
          new TreeNode(`${currentKey}`, name, false, current),
        );
      } else if (child) {
        current = child;
      }
    }
  }

  return rootNode;
}

export type VisibleRow = { node: TreeNode; depth: number };

/**
 * Flattens the tree into an ordered list of visible rows based on which
 * directories are expanded. The root itself is not emitted; its direct
 * children are depth 0.
 */
export function flattenVisible(
  root: TreeNode,
  expanded: ReadonlySet<string>,
): VisibleRow[] {
  const out: VisibleRow[] = [];
  const walk = (node: TreeNode, depth: number) => {
    const children = sortedChildren(node);
    for (const child of children) {
      out.push({ node: child, depth });
      if (child.isDirectory && expanded.has(child.key)) {
        walk(child, depth + 1);
      }
    }
  };
  walk(root, 0);
  return out;
}

export function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    const al = a.name.toLowerCase();
    const bl = b.name.toLowerCase();
    if (al < bl) return -1;
    if (al > bl) return 1;
    return 0;
  });
}

export function collectAllDirectoryKeys(root: TreeNode): Set<string> {
  const keys = new Set<string>();
  const walk = (node: TreeNode) => {
    for (const child of node.children) {
      if (child.isDirectory) {
        keys.add(child.key);
        walk(child);
      }
    }
  };
  walk(root);
  return keys;
}
