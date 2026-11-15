import { createFileRoute } from "@tanstack/solid-router";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar";
import { getSession } from "~/lib/session";

const SearchSchema = v.object({});

export const Route = createFileRoute("/")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  loader: async () => {
    const session = await getSession();
    return { session };
  },
  component: Landing,
});

function Landing() {
  const data = Route.useLoaderData();
  return (
    <>
      <TopBar session={data().session} />
      <main class="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <section>
          <h1 class="text-4xl font-semibold tracking-tight">Learn Robotics</h1>
        </section>
        <section>
          <h2 class="text-2xl font-medium mb-3">Courses</h2>
          <ul class="space-y-2">
            <li>
              <a
                class="text-blue underline-offset-4 hover:underline"
                href="/courses/intro-to-java"
              >
                Intro To Java (alpha)
              </a>
            </li>
            <li>
              <a
                class="text-blue underline-offset-4 hover:underline"
                href="/courses/program-a-tank-drive"
              >
                Program a Tank Drive
              </a>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
