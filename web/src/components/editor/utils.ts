import type { Monaco } from "@monaco-editor/loader";
import type * as monacoEditor from "monaco-editor";

export function getOrCreateModel(
  monaco: Monaco,
  value: string,
  language: string | undefined,
  path: string | undefined,
): monacoEditor.editor.ITextModel {
  const uri = path ? monaco.Uri.parse(path) : undefined;
  const existing = uri ? monaco.editor.getModel(uri) : null;
  if (existing) {
    return existing;
  }
  return monaco.editor.createModel(value, language, uri);
}
