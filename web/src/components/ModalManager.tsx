import {
  createContext,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
  useContext,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";

type ModalContextValue = {
  open: (render: Component) => void;
  close: () => void;
};

const ModalContext = createContext<ModalContextValue>();

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider(props: { children: JSX.Element }): JSX.Element {
  const [content, setContent] = createSignal<Component | null>(null);

  const open = (render: Component) => setContent(() => render);
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
          class="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4"
          onClick={close}
        >
          <div
            class="w-full max-w-2xl rounded-lg bg-background text-primary shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Dynamic component={content()!} />
          </div>
        </div>
      </Show>
    </ModalContext.Provider>
  );
}
