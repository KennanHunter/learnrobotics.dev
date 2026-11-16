import { createFileRoute } from "@tanstack/solid-router";
import { TopBar } from "~/components/TopBar/TopBar";
import { m } from "~/paraglide/messages";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <>
      <TopBar />
      <main class="mx-auto max-w-2xl px-4 py-8">
        <h1 class="text-2xl font-semibold">{m.about_heading()}</h1>
        <p class="mt-4">{m.about_body()}</p>
      </main>
    </>
  );
}
