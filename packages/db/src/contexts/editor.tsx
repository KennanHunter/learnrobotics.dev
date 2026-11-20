import { createContext, useContext, type Accessor, type JSX } from "solid-js";

export type EditorData = {
  currentLesson: Accessor<null>;
};

const EditorDataContext = createContext<EditorData>();

export function EditorDataProvider(props: {
  children: JSX.Element;
}): JSX.Element {
  const value: EditorData = {
    currentLesson: () => null,
  };

  return (
    <EditorDataContext.Provider value={value}>
      {props.children}
    </EditorDataContext.Provider>
  );
}

export function useEditor(): EditorData {
  const ctx = useContext(EditorDataContext);
  if (!ctx) throw new Error("useEditor must be used within EditorDataProvider");
  return ctx;
}
