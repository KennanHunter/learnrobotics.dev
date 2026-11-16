import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import { useSession } from "~/lib/session-context";
import { autoThemeFor } from "~/lib/monaco-themes";
import type { Theme } from "~/lib/session";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "ThemeProvider" });

type ThemeCtx = {
  effectiveTheme: () => Theme;
  monacoTheme: () => string;
};

const ThemeContext = createContext<ThemeCtx>();

export function ThemeProvider(props: { children: JSX.Element }): JSX.Element {
  const session = useSession();
  const [systemTheme, setSystemTheme] = createSignal<Theme>("light");

  onMount(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const initial = mq.matches ? "dark" : "light";
    setSystemTheme(initial);
    log.debug({ systemTheme: initial }, "matchMedia bound");
    const onChange = (e: MediaQueryListEvent) => {
      const next = e.matches ? "dark" : "light";
      log.info({ systemTheme: next }, "OS color scheme changed");
      setSystemTheme(next);
    };
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  });

  const effectiveTheme = (): Theme => {
    const t = session()?.theme;
    if (t === "light" || t === "dark") return t;
    if (isServer) return "light";
    return systemTheme();
  };

  const monacoTheme = (): string => {
    const explicit = session()?.monacoTheme;
    if (explicit) return explicit;
    return autoThemeFor(effectiveTheme());
  };

  if (!isServer) {
    onMount(() => {
      log.debug(
        {
          sessionTheme: session()?.theme,
          sessionMonaco: session()?.monacoTheme,
          effective: effectiveTheme(),
          monaco: monacoTheme(),
        },
        "ThemeProvider mounted",
      );
    });
  }

  return (
    <ThemeContext.Provider value={{ effectiveTheme, monacoTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
