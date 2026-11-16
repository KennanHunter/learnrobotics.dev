import { createJSXDecorator } from "storybook-solidjs-vite";
import { SessionProvider } from "~/lib/session-context";
import type { SessionSummary } from "~/lib/session";
import adaPfp from "./AdaLovelacePfp.jpg";

export function withSession(session: SessionSummary) {
  return createJSXDecorator((Story) => (
    <SessionProvider session={() => session}>
      <Story />
    </SessionProvider>
  ));
}

export const signedInSession: SessionSummary = {
  userId: "user_demo",
  name: "Ada Lovelace",
  image: adaPfp,
  isAnonymous: false,
  language: "en",
  theme: "light",
};

export const anonymousSession: SessionSummary = {
  userId: "user_anon",
  name: "Guest",
  image: null,
  isAnonymous: true,
  language: "en",
  theme: null,
};
