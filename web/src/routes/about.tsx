import { createFileRoute } from "@tanstack/solid-router";
import { FIRST, FirstCopyright } from "~/components/FIRST/FIRST";
import { TopBar } from "~/components/TopBar/TopBar";
import ccLicense from "../../../LICENSES/CC-BY-NC-SA-4.0.txt?raw";
import mit0License from "../../../LICENSES/MIT-0.txt?raw";
import polyformLicense from "../../../LICENSES/PolyForm-Noncommercial-1.0.0.md?raw";

const licenseFiles: Array<{ title: string; body: string }> = [
  { title: "Lesson content — CC BY-NC-SA 4.0", body: ccLicense },
  { title: "Starter code — MIT-0", body: mit0License },
  {
    title: "Platform code — PolyForm Noncommercial 1.0.0",
    body: polyformLicense,
  },
];

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <>
      <TopBar />
      <main class="mx-auto max-w-3xl px-6 py-12 space-y-12">
        <section class="space-y-4">
          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            About Learn Robotics
          </h1>
          <p class="text-foreground-muted">
            Programming for <FIRST /> is a difficult environment to learn in.
            You get maybe a couple hours a week with the actual robot, and half
            of that gets eaten fighting syntax instead of figuring out why your
            autos are inconsistent.
          </p>
          <p class="text-foreground-muted">
            Learn Java here with a fast compiler, so robot time goes to robot
            problems.
          </p>
          <p class="text-foreground-muted">
            It starts at the beginning and goes further than most teams expect.
            When you master the fundamentals, writing code stops being the hard
            part. That frees you up to focus on the real problems, like
            integrating with vendors and debugging actual robot behavior.
          </p>
          <FirstCopyright class="text-xs text-foreground-subtle pt-2" />
        </section>

        <section class="space-y-3 border-t border-background-offset pt-8">
          <h2 class="text-xl font-semibold tracking-tight">
            About the creator
          </h2>
          <p class="text-foreground-muted">
            Placeholder. A proper write-up is coming.
          </p>
        </section>

        <section class="space-y-3 border-t border-background-offset pt-8">
          <h2 class="text-xl font-semibold tracking-tight">AI Usage</h2>
          <p class="text-foreground-muted">
            All articles are hand written. For the full policy on how and where
            AI is used across the site, read{" "}
            <a
              href="/ai-transparency"
              class="underline underline-offset-4 hover:text-primary"
            >
              AI Transparency
            </a>
            .
          </p>
        </section>

        <section class="space-y-4 border-t border-background-offset pt-8">
          <h2 class="text-xl font-semibold tracking-tight">Licensing</h2>
          <p class="text-foreground-muted">
            learnrobotics.dev isn't open source. The reasoning is simple: we
            never want to prevent someone from doing something cool with this
            work. We do want to prevent someone taking it without effort and
            making money off it.
          </p>
          <p class="text-foreground-muted">
            Just want your students to use the site? Go ahead, even for a paid
            camp or class. Licensing only matters if you want to{" "}
            <span class="font-medium text-primary">copy, adapt, or host</span>{" "}
            our content or code yourself.
          </p>
          <ul class="space-y-3 text-foreground-muted">
            <li>
              <span class="font-medium text-primary">No license needed:</span>{" "}
              using the site with students (camps, teams, classes), or linking
              to any lesson.
            </li>
            <li>
              <span class="font-medium text-primary">
                Free with credit (noncommercial):
              </span>{" "}
              copying or adapting lessons for things like team training docs or
              class handouts. Credit us and share your version under the same
              license.
            </li>
            <li>
              <span class="font-medium text-primary">
                Commercial license needed:
              </span>{" "}
              hosting your own paid, subscription, or ad-supported instance, or
              using our content in a paid product (book, paid course, and so
              on).
            </li>
          </ul>
          <p class="text-foreground-muted">
            Doing something we'd probably get behind, like a nonprofit program,
            a community event, or <FIRST /> outreach? Reach out to{" "}
            <a
              href="mailto:licensing@kennan.dev"
              class="underline underline-offset-4 hover:text-primary"
            >
              licensing@kennan.dev
            </a>{" "}
            and we'll work something out, most likely for free. Same address for
            questions or commercial licenses.
          </p>
          <p class="text-sm text-foreground-subtle">
            Summaries above; the files below are what actually count. Content is{" "}
            <span class="font-medium">CC BY-NC-SA 4.0</span>, starter code is{" "}
            <span class="font-medium">MIT-0</span>, and the platform is{" "}
            <span class="font-medium">PolyForm Noncommercial 1.0.0</span>. You
            own the code you write on the site.
          </p>

          <div class="space-y-4 pt-4">
            {licenseFiles.map((file) => (
              <details class="rounded-md border border-background-offset">
                <summary class="cursor-pointer px-4 py-2 text-sm font-medium">
                  {file.title}
                </summary>
                <pre class="max-h-[40lh] overflow-auto border-t border-background-offset px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {file.body}
                </pre>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
