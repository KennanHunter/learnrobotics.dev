import { AiOutlineReload } from "solid-icons/ai/AiOutlineReload";
import { AiOutlineExport } from "solid-icons/ai/AiOutlineExport";
import { useCodeRunner } from "@learnrobotics/editor/variants/code-runner";
import { ActionsMenu } from "~/components/ActionsMenu";
import { useConfirm } from "~/components/ConfirmDialog";

export type EditorActionsMenuProps = {
  /** The starter to reset to on Reset to starter. */
  starter: {
    id: string;
    title: string;
    files: Record<string, string>;
    activeFile: string;
  };
};

/**
 * Three-dot dropdown rendered to the right of the editor panel header.
 * Owns the Reset-to-starter confirmation + Export (logs for now). Must
 * be mounted inside a CodeRunnerProvider.
 */
export function EditorActionsMenu(props: EditorActionsMenuProps) {
  const store = useCodeRunner();
  const confirm = useConfirm();

  const resetToStarter = () => {
    const current = Object.keys(store.files());
    const nextKeys = new Set(Object.keys(props.starter.files));
    // Drop keys that exist today but aren't in the starter.
    for (const path of current) {
      if (!nextKeys.has(path)) store.deleteFile(path);
    }
    // Overwrite / create keys from the starter.
    for (const [path, content] of Object.entries(props.starter.files)) {
      store.setFileContent(path, content);
    }
    store.setActiveFile(props.starter.activeFile);
  };

  const onReset = () => {
    confirm({
      title: "Reset to starter?",
      description: (
        <>
          This discards every edit in this project and restores{" "}
          <span class="font-medium text-foreground">{props.starter.title}</span>{" "}
          to its starter files. The autosave will then push the reset state to
          the server.
        </>
      ),
      confirmLabel: "Reset",
      destructive: true,
      onConfirm: resetToStarter,
    });
  };

  const onExport = () => {
    // Logs only for now — a real download hook will land alongside the
    // existing ExportButton behavior.
    console.log("[editor-actions] export", {
      starterId: props.starter.id,
      activeFile: store.activeFile(),
      fileKeys: Object.keys(store.files()),
    });
  };

  return (
    <ActionsMenu
      label="Editor actions"
      items={[
        {
          id: "reset",
          label: "Reset to starter",
          icon: <AiOutlineReload />,
          run: onReset,
        },
        {
          id: "export",
          label: "Export",
          icon: <AiOutlineExport />,
          run: onExport,
        },
      ]}
    />
  );
}
