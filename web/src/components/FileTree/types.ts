export class TreeNode {
  key: string;
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
  parent: TreeNode | null;

  constructor(
    key: string,
    name: string,
    isDirectory: boolean,
    parent: TreeNode | null,
  ) {
    this.key = key;
    this.name = name;
    this.isDirectory = isDirectory;
    this.children = [];
    this.parent = parent;
  }

  get path(): string {
    if (this.parent == null) return "";
    const parentPath = this.parent.path;
    return parentPath === "" ? this.name : `${parentPath}/${this.name}`;
  }

  isDescendantOf(other: TreeNode): boolean {
    let parent = this.parent;
    while (parent) {
      if (parent === other) return true;
      parent = parent.parent;
    }
    return false;
  }
}

export type FileTreeAction =
  | {
      kind: "action";
      id: string;
      label: string;
      enabled?: boolean;
      run: () => void;
    }
  | { kind: "separator" };
