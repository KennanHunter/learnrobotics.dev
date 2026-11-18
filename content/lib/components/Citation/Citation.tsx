import {
  createContext,
  createSignal,
  For,
  Show,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";

export type CitationData = {
  id: string;
  href: string;
  title: string;
  description?: string;
};

type Ctx = {
  register: (c: CitationData) => number;
  list: Accessor<CitationData[]>;
};

const CitationsContext = createContext<Ctx>();

export function CitationsProvider(props: { children: JSX.Element }) {
  const [list, setList] = createSignal<CitationData[]>([]);
  const register = (c: CitationData) => {
    const current = list();
    const existing = current.findIndex((x) => x.id === c.id);
    if (existing >= 0) return existing + 1;
    setList([...current, c]);
    return current.length + 1;
  };
  return (
    <CitationsContext.Provider value={{ register, list }}>
      {props.children}
    </CitationsContext.Provider>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Citation(props: {
  href: string;
  title: string;
  description?: string;
  /** Optional stable id for dedup; derived from href+title otherwise. */
  id?: string;
}) {
  const ctx = useContext(CitationsContext);
  if (!ctx) {
    throw new Error(
      "<Citation> must be rendered inside a <CitationsProvider>.",
    );
  }
  const id = props.id ?? slugify(`${props.href}-${props.title}`);
  const n = ctx.register({
    id,
    href: props.href,
    title: props.title,
    description: props.description,
  });
  return (
    <sup class="not-prose">
      <a
        id={`citation-ref-${n}`}
        href={`#citation-${n}`}
        class="px-0.5 text-foreground-muted no-underline hover:text-foreground"
      >
        [{n}]
      </a>
    </sup>
  );
}

export function CitationList() {
  const ctx = useContext(CitationsContext);
  if (!ctx) return null;
  return (
    <Show when={ctx.list().length > 0}>
      <section
        id="citations"
        class="not-prose mt-12 border-t border-background-offset/60 pt-6"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          Citations
        </h2>
        <ol class="flex flex-col gap-3 text-sm">
          <For each={ctx.list()}>
            {(c, i) => (
              <li
                id={`citation-${i() + 1}`}
                class="flex gap-2 scroll-mt-20"
              >
                <span class="text-foreground-muted">[{i() + 1}]</span>
                <div class="flex flex-col gap-0.5">
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    class="font-medium underline decoration-foreground-muted/50 hover:decoration-foreground"
                  >
                    {c.title}
                  </a>
                  <Show when={c.description}>
                    <p class="text-foreground-muted">{c.description}</p>
                  </Show>
                </div>
              </li>
            )}
          </For>
        </ol>
      </section>
    </Show>
  );
}
