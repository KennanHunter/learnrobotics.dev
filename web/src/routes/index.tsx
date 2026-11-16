import { createFileRoute } from "@tanstack/solid-router";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import { m } from "~/paraglide/messages";
import { localizeHref } from "~/paraglide/runtime";

const SearchSchema = v.object({});

export const Route = createFileRoute("/")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Landing,
});

function Landing() {
  return (
    <>
      <TopBar />
      <main class="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <section>
          <h1 class="text-4xl font-semibold tracking-tight">{m.home_heading()}</h1>
        </section>
        <section>
          <h2 class="text-2xl font-medium mb-3">{m.home_courses()}</h2>
          <ul class="space-y-2">
            <li>
              <a
                class="text-blue underline-offset-4 hover:underline"
                href={localizeHref("/courses/intro-to-java")}
              >
                {m.home_course_intro_java()}
              </a>
            </li>
            <li>
              <a
                class="text-blue underline-offset-4 hover:underline"
                href={localizeHref("/courses/program-a-tank-drive")}
              >
                {m.home_course_tank_drive()}
              </a>
            </li>
          </ul>
        </section>
        <section>
          <h2 class="text-2xl font-medium mb-3">{m.home_playground_heading()}</h2>
          <a
            class="text-blue underline-offset-4 hover:underline"
            href={localizeHref("/playground")}
          >
            {m.home_playground_link()}
          </a>
        </section>
      </main>
    </>
  );
}
