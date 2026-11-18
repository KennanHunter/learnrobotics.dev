import {
  createSignal,
  createEffect,
  onCleanup,
  type JSX,
  onMount,
  mergeProps,
  on,
} from "solid-js";
import * as monacoEditor from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker?worker";
import loader, { type Monaco } from "@monaco-editor/loader";

(
  self as unknown as { MonacoEnvironment: monacoEditor.Environment }
).MonacoEnvironment = {
  getWorker(_workerId, label) {
    switch (label) {
      case "json":
        return new JsonWorker();
      case "css":
      case "scss":
      case "less":
        return new CssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new HtmlWorker();
      case "typescript":
      case "javascript":
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

import { Loader } from "./Loader";
import { MonacoContainer } from "./MonacoContainer";
import { getOrCreateModel } from "./utils";
import type { LoaderParams } from "./types";

const viewStates = new Map<
  string | undefined,
  monacoEditor.editor.ICodeEditorViewState | null
>();

export interface MonacoEditorProps {
  language?: string;
  value?: string;
  loadingState?: JSX.Element;
  class?: string;
  theme?: monacoEditor.editor.BuiltinTheme | string;
  path?: string;
  overrideServices?: monacoEditor.editor.IEditorOverrideServices;
  width?: string;
  height?: string;
  options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
  saveViewState?: boolean;
  loaderParams?: LoaderParams;
  onChange?: (
    value: string,
    event: monacoEditor.editor.IModelContentChangedEvent,
  ) => void;
  onMount?: (
    monaco: Monaco,
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    model: monacoEditor.editor.ITextModel | null,
  ) => void;
  registerThemes?: (monaco: Monaco) => void;
  onBeforeUnmount?: (
    monaco: Monaco,
    editor: monacoEditor.editor.IStandaloneCodeEditor,
  ) => void;
}

export function MonacoEditor(inputProps: MonacoEditorProps) {
  const props = mergeProps(
    {
      theme: "vs",
      width: "100%",
      height: "100%",
      loadingState: "Loading…",
      saveViewState: true,
    },
    inputProps,
  );

  let containerRef!: HTMLDivElement;

  const [monaco, setMonaco] = createSignal<Monaco>();
  const [editor, setEditor] =
    createSignal<monacoEditor.editor.IStandaloneCodeEditor>();

  let abortInitialization: (() => void) | undefined;
  let monacoOnChangeSubscription: monacoEditor.IDisposable | undefined;
  let isOnChangeSuppressed = false;

  onMount(async () => {
    loader.config(inputProps.loaderParams ?? { monaco: monacoEditor });
    const loadMonaco = loader.init();

    abortInitialization = () => loadMonaco.cancel();

    try {
      const m = await loadMonaco;
      props.registerThemes?.(m);
      if (props.theme) m.editor.setTheme(props.theme);
      const ed = createEditor(m);
      setMonaco(m);
      setEditor(ed);
      props.onMount?.(m, ed, ed.getModel());

      monacoOnChangeSubscription = ed.onDidChangeModelContent(
        (event: monacoEditor.editor.IModelContentChangedEvent) => {
          if (!isOnChangeSuppressed) {
            props.onChange?.(ed.getValue(), event);
          }
        },
      );
    } catch (error: unknown) {
      if ((error as { type?: string } | null)?.type === "cancelation") {
        return;
      }
      console.error("Could not initialize Monaco", error);
    }
  });

  onCleanup(() => {
    const _editor = editor();
    if (!_editor) {
      abortInitialization?.();
      return;
    }

    props.onBeforeUnmount?.(monaco()!, _editor);
    monacoOnChangeSubscription?.dispose();
    _editor.getModel()?.dispose();
    _editor.dispose();
  });

  createEffect(
    on(
      () => props.value,
      (value) => {
        const _editor = editor();
        if (!_editor || typeof value === "undefined") {
          return;
        }

        if (_editor.getOption(monaco()!.editor.EditorOption.readOnly)) {
          _editor.setValue(value);
          return;
        }

        if (value !== _editor.getValue()) {
          isOnChangeSuppressed = true;

          _editor.executeEdits("", [
            {
              range: _editor.getModel()!.getFullModelRange(),
              text: value,
              forceMoveMarkers: true,
            },
          ]);

          _editor.pushUndoStop();
          isOnChangeSuppressed = false;
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.options,
      (options) => {
        editor()?.updateOptions(options ?? {});
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.theme,
      (theme) => {
        monaco()?.editor.setTheme(theme);
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.language,
      (language) => {
        const model = editor()?.getModel();
        if (!language || !model) {
          return;
        }
        monaco()?.editor.setModelLanguage(model, language);
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.path,
      (path, prevPath) => {
        const _monaco = monaco();
        if (!_monaco) {
          return;
        }

        const model = getOrCreateModel(
          _monaco,
          props.value ?? "",
          props.language,
          path,
        );

        if (model !== editor()?.getModel()) {
          if (props.saveViewState) {
            viewStates.set(prevPath, editor()?.saveViewState() ?? null);
          }
          editor()?.setModel(model);
          if (props.saveViewState) {
            editor()?.restoreViewState(viewStates.get(path) ?? null);
          }
        }
      },
      { defer: true },
    ),
  );

  const createEditor = (monaco: Monaco) => {
    const model = getOrCreateModel(
      monaco,
      props.value ?? "",
      props.language,
      props.path,
    );

    return monaco.editor.create(
      containerRef,
      {
        model,
        automaticLayout: true,
        ...props.options,
      },
      props.overrideServices,
    );
  };

  return (
    <MonacoContainer
      class={props.class}
      width={props.width}
      height={props.height}
    >
      {!editor() && <Loader>{props.loadingState}</Loader>}
      <div style={{ width: "100%", height: "100%" }} ref={containerRef} />
    </MonacoContainer>
  );
}
