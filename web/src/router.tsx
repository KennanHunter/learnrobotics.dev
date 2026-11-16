import { createRouter as createTanStackRouter } from "@tanstack/solid-router";
import { routeTree } from "./routeTree.gen";
import { getLocale } from "~/paraglide/runtime";

export function getRouter() {
  // Paraglide owns the locale prefix (/en, /pirate). On the server the
  // middleware delocalizes the URL before TanStack sees it; on the client
  // we tell TanStack the current locale IS the basepath so route matching
  // ignores it. Keeps server and client in agreement during hydration.
  return createTanStackRouter({
    routeTree,
    basepath: `/${getLocale()}`,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/solid-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
