import type * as monacoEditor from "monaco-editor";

export type LoaderParams = {
  paths?: { vs?: string };
  "vs/nls"?: { availableLanguages?: Record<string, string> };
  monaco?: typeof monacoEditor;
};
