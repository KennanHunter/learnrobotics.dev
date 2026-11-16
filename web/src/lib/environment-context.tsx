import { createContext, useContext, type JSX } from "solid-js";

export type Environment = "development" | "preview" | "alpha";

const EnvironmentContext = createContext<() => Environment | undefined>(
  () => undefined,
);

export function EnvironmentProvider(props: {
  environment: () => Environment | undefined;
  children: JSX.Element;
}): JSX.Element {
  return (
    <EnvironmentContext.Provider value={props.environment}>
      {props.children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): () => Environment | undefined {
  return useContext(EnvironmentContext);
}
