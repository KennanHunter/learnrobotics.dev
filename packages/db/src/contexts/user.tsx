import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import type { SessionSummary, Theme } from "../data/session";

type UserDataCtx = {
  session: () => SessionSummary;
  effectiveTheme: () => Theme;
  monacoTheme: () => string | null;
  tabSize: () => number;
};

export const DEFAULT_TAB_SIZE = 4;

const UserDataContext = createContext<UserDataCtx>();

export function UserDataProvider(props: {
  session: () => SessionSummary;
  children: JSX.Element;
}): JSX.Element {
  const [systemTheme, setSystemTheme] = createSignal<Theme>("light");

  onMount(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mq.matches ? "dark" : "light");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  });

  const effectiveTheme = (): Theme => {
    const t = props.session()?.theme;
    if (t === "light" || t === "dark") return t;
    if (isServer) return "light";
    return systemTheme();
  };

  const monacoTheme = (): string | null => {
    return props.session()?.monacoTheme ?? null;
  };

  const tabSize = (): number => {
    const n = props.session()?.tabSize;
    return typeof n === "number" && Number.isInteger(n) && n > 0
      ? n
      : DEFAULT_TAB_SIZE;
  };

  return (
    <UserDataContext.Provider
      value={{
        session: props.session,
        effectiveTheme,
        monacoTheme,
        tabSize,
      }}
    >
      {props.children}
    </UserDataContext.Provider>
  );
}

function useUserData(): UserDataCtx {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("Hook must be used within UserDataProvider");
  return ctx;
}

export function useSession(): () => SessionSummary {
  return useUserData().session;
}

export function useTheme(): {
  effectiveTheme: () => Theme;
  monacoTheme: () => string | null;
} {
  const { effectiveTheme, monacoTheme } = useUserData();
  return { effectiveTheme, monacoTheme };
}

export function useTabSize(): () => number {
  return useUserData().tabSize;
}
