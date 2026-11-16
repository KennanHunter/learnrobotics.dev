import { createContext, useContext, type JSX } from "solid-js";
import type { SessionSummary } from "./session";

const SessionContext = createContext<() => SessionSummary>();

export function SessionProvider(props: {
  session: () => SessionSummary;
  children: JSX.Element;
}): JSX.Element {
  return (
    <SessionContext.Provider value={props.session}>
      {props.children}
    </SessionContext.Provider>
  );
}

export function useSession(): () => SessionSummary {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
