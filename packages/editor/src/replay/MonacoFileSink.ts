import type { Monaco } from "@monaco-editor/loader";
import type * as monacoEditor from "monaco-editor";
import type { FileSink, MonacoChange, MonacoRange } from "@learnrobotics/events";
import { getOrCreateModel } from "../CodeEditor/utils";

function languageOf(path: string): string {
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".json")) return "json";
  return "plaintext";
}

/**
 * FileSink backed by a single Monaco editor instance. Owned by useReplayHost.
 * The editor is expected to be in readOnly mode — the sink mutates models
 * directly, not through user edits.
 */
export type MonacoFileSinkOptions = {
  /** URI scheme prefix so replay models don't collide with the student's
   * live models (which live under the plain path). Default `replay://`. */
  pathPrefix?: string;
};

export class MonacoFileSink implements FileSink {
  private readonly prefix: string;

  constructor(
    private readonly monaco: Monaco,
    private readonly editor: monacoEditor.editor.IStandaloneCodeEditor,
    options?: MonacoFileSinkOptions,
  ) {
    this.prefix = options?.pathPrefix ?? "replay://";
  }

  private uriFor(path: string): string {
    return `${this.prefix}${path}`;
  }

  replaceAllFiles(files: Record<string, string>, activeFile: string): void {
    // Create a model for every path so later `setActiveFile` can swap without
    // re-seeding. Reset each model's value — Monaco de-dupes models by URI,
    // so without this a reload would reuse stale content.
    for (const [path, content] of Object.entries(files)) {
      const model = getOrCreateModel(
        this.monaco,
        content,
        languageOf(path),
        this.uriFor(path),
      );
      if (model.getValue() !== content) {
        model.setValue(content);
      }
    }
    this.setActiveFile(activeFile);
  }

  applyEdit(file: string, changes: readonly MonacoChange[]): void {
    const model = this.getModel(file);
    model.applyEdits(
      changes.map((c) => ({
        range: c.range,
        text: c.text,
        forceMoveMarkers: true,
      })),
    );
  }

  setActiveFile(file: string): void {
    const model = this.getModel(file);
    if (this.editor.getModel() !== model) {
      this.editor.setModel(model);
    }
  }

  createFile(file: string, initialContent: string): void {
    getOrCreateModel(
      this.monaco,
      initialContent,
      languageOf(file),
      this.uriFor(file),
    );
  }

  deleteFile(file: string): void {
    const uri = this.monaco.Uri.parse(this.uriFor(file));
    const model = this.monaco.editor.getModel(uri);
    model?.dispose();
  }

  renameFile(from: string, to: string): void {
    const src = this.monaco.editor.getModel(
      this.monaco.Uri.parse(this.uriFor(from)),
    );
    if (!src) return;
    const content = src.getValue();
    const lang = languageOf(to);
    getOrCreateModel(this.monaco, content, lang, this.uriFor(to));
    src.dispose();
  }

  setCursor(file: string, line: number, column: number): void {
    const model = this.getModel(file);
    if (this.editor.getModel() !== model) this.editor.setModel(model);
    this.editor.setPosition({ lineNumber: line, column });
    this.editor.revealPositionInCenterIfOutsideViewport({
      lineNumber: line,
      column,
    });
  }

  setSelection(file: string, ranges: readonly MonacoRange[]): void {
    const model = this.getModel(file);
    if (this.editor.getModel() !== model) this.editor.setModel(model);
    if (ranges.length === 0) return;
    const [primary, ...rest] = ranges;
    this.editor.setSelection(primary);
    if (rest.length > 0) {
      this.editor.setSelections(
        ranges.map((r) => ({
          selectionStartLineNumber: r.startLineNumber,
          selectionStartColumn: r.startColumn,
          positionLineNumber: r.endLineNumber,
          positionColumn: r.endColumn,
        })),
      );
    }
  }

  private getModel(file: string): monacoEditor.editor.ITextModel {
    // If the model hasn't been created yet (shouldn't happen post-init, but
    // defensive), make an empty one so applyEdit doesn't throw.
    return getOrCreateModel(this.monaco, "", languageOf(file), this.uriFor(file));
  }
}
