import { createJSXDecorator } from "storybook-solidjs-vite";
import { SessionProvider } from "~/lib/session-context";
import { ThemeProvider } from "~/lib/theme-context";
import type { SessionSummary } from "~/lib/session";
import {
  EnvironmentProvider,
  type Environment,
} from "~/lib/environment-context";
import adaPfp from "./AdaLovelacePfp.jpg";

export function withSession(session: SessionSummary) {
  return createJSXDecorator((Story) => (
    <SessionProvider session={() => session}>
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    </SessionProvider>
  ));
}

export function withEnvironment(environment: Environment | undefined) {
  return createJSXDecorator((Story) => (
    <EnvironmentProvider environment={() => environment}>
      <Story />
    </EnvironmentProvider>
  ));
}

export const signedInSession: SessionSummary = {
  userId: "user_demo",
  name: "Ada Lovelace",
  image: adaPfp,
  isAnonymous: false,
  theme: "light",
  monacoTheme: null,
};

export const anonymousSession: SessionSummary = {
  userId: "user_anon",
  name: "Guest",
  image: null,
  isAnonymous: true,
  theme: null,
  monacoTheme: null,
};
