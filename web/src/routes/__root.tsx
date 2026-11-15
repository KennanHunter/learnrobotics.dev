import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/solid-router";
import { ErrorPage } from "~/components/ErrorPage";
import { ModalProvider } from "~/components/ModalManager";
import { getSession } from "~/lib/session";
import styles from "~/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Learn Robotics" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  beforeLoad: async () => {
    const session = await getSession();
    return { session };
  },
  component: RootDocument,
  notFoundComponent: () => (
    <ErrorPage
      code="404"
      title="This page took a wrong turn."
      message="The page you’re looking for isn’t here. It may have moved, or the link might be out of date."
    />
  ),
  errorComponent: (props) => {
    const err = props.error as unknown;
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : undefined;
    const detail =
      err instanceof Error && err.stack ? err.stack : undefined;
    return (
      <ErrorPage
        code="500"
        title="Something went wrong on our end."
        message={
          message ??
          "An unexpected error occurred while loading this page. Try again in a moment."
        }
        detail={import.meta.env.DEV ? detail : undefined}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            class="rounded border border-gray px-4 py-2 text-sm hover:bg-gray/10"
          >
            Reload
          </button>
        }
      />
    );
  },
});

function RootDocument() {
  const ctx = Route.useRouteContext();
  const themeClass = () => {
    const t = ctx().session?.theme;
    return t === "dark" ? "dark" : "";
  };
  return (
    <html lang="en" class={themeClass()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ModalProvider>
          <Outlet />
        </ModalProvider>
        <Scripts />
      </body>
    </html>
  );
}
