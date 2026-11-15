import {
  createContext,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
  useContext,
} from "solid-js";

type ModalContextValue = {
  open: (node: JSX.Element) => void;
  close: () => void;
};

const ModalContext = createContext<ModalContextValue>();

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider(props: { children: JSX.Element }): JSX.Element {
  const [content, setContent] = createSignal<JSX.Element | null>(null);

  const open = (node: JSX.Element) => setContent(() => node);
  const close = () => setContent(null);

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <ModalContext.Provider value={{ open, close }}>
      {props.children}
      <Show when={content()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            class="w-full max-w-2xl rounded-lg bg-white text-black shadow-xl dark:bg-black dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {content()}
          </div>
        </div>
      </Show>
    </ModalContext.Provider>
  );
}
