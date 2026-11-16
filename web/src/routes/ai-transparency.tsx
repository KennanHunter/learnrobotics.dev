import { createFileRoute } from "@tanstack/solid-router";
import { FIRST } from "~/components/FIRST/FIRST";
import { Footer } from "~/components/Footer/Footer";
import { Note } from "~/components/Note/Note";
import { TopBar } from "~/components/TopBar/TopBar";
import { TransparencyLogEntry } from "~/components/TransparencyLogEntry/TransparencyLogEntry";

export const Route = createFileRoute("/ai-transparency")({
  component: AITransparency,
});

function AITransparency() {
  return (
    <>
      <TopBar />
      <main>
        <div class="mx-auto max-w-3xl space-y-10 px-6 py-12">
          <section class="space-y-3">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
              AI Transparency
            </h1>

            <Note>
              TLDR: Content is human written. AI is used for scoped and
              verifiable development tasks.
            </Note>

            <p class="text-foreground-muted">
              I find myself quite conflicted on AI use. First, a few goals of
              this course.
            </p>
            <ol class="list-decimal pl-6 text-foreground-muted">
              <li>Provide quality content.</li>
              <li>
                Provide a gradual onboarding to real controls and robotics
                concepts.
              </li>
              <li>
                Be immediately useful to students in <FIRST />.
              </li>
              <li>
                Use our knowledge as Alumni and Mentors to understand what
                concepts are actually needed and when.
              </li>
            </ol>
            <p class="text-foreground-muted">
              I think that using AI directly for lesson content would conflict
              with these. We are past the point that we can pretend AI models
              are not infuriatingly effective at what they do, but when I see
              students directly prompting LLMs, I worry that they are not
              gaining the fundamentals that'll make their experience as
              programmers worthwhile. I consider myself quite lucky to have
              gotten to experience <FIRST /> before AI coding agents evolved to
              the point they are at.
            </p>
            <p class="text-foreground-muted">
              That being said, as a developer, being able to spin up features
              fast is very powerful, and to avoid it completely would be making
              my life harder for little reason. I used AI agents to write much
              of our user management code. I feel comfortable doing that,
              because at this point in my life, I've written user management
              code probably 30 times from scratch, and can very quickly tell if
              an important route is misconfigured. As an industry as a whole,
              one of my biggest fears is that students and junior devs who are
              building for the first time with expert-level programmers in their
              terminal will miss out on the hard lessons: the days tracing
              annoying errors or the error in prod you spend a frantic hour
              fixing. Doing these myself I think built my debugging and analysis
              skills much better than if I had AI at the time.
            </p>

            <p class="text-foreground-muted">
              I'm still figuring out exactly how much I'm okay with AI usage in
              a project like this. I think the incentives are uniquely set up.
              My professional work has been in startup environments, where speed
              to market trumps almost all else. In those environments, the more
              you can delegate to AI the better. I don't think this is the same
              kind of project, but right now, in pre-alpha, I want to get
              something real out as fast as possible, so I can get real feedback
              from users on what does and doesn't work, especially with the
              looming deadline of the SystemCore release, where this course will
              be uniquely helpful to students.
            </p>

            <p class="text-foreground-muted">
              It's also worth saying that once you learn to identify AI
              generated text, a fatigue sets in. To some extent it feels like if
              someone didn't even put in effort writing it, why should you put
              in effort reading it? One time, I was sent a 10,000-word document.
              Useful information, but entirely AI generated, with no care for
              applicability or quality. I begrudgingly read it for maybe 2
              minutes before passing it into my own AI and asking it to pull out
              the actual important parts. That sucked. I think as a community,
              we need to figure out exactly how AI interfaces with the technical
              content we deliver, and I think the rules below are a good middle
              ground between ensuring quality and voice, but not hindering
              development speed.
            </p>

            <p class="text-foreground-muted">
              So for now, here are the real rules. All lesson content is written
              by a real human. An AI might make critiques on conciseness and
              structure. Where I dip into anything complicated, I'll provide
              links to available high-quality public resources, and do the due
              diligence on my side to make sure of accuracy.
            </p>

            <p class="text-foreground-muted">
              I do use AI for many programming tasks. The rules there are that
              it has to be either meticulously reviewed by me, or scoped in such
              a way that quality is confirmed either with tests or by being
              enough of a throw-away that a little slop is okay.
            </p>

            <p class="text-foreground-muted">
              If the rambling wasn't a clue, I'm still working this out. If you
              have thoughts, I'd love to hear them.
            </p>
            <a
              href="mailto:contact@kennan.dev"
              class="text-foreground-muted underline"
            >
              contact@kennan.dev
            </a>
          </section>

          <section class="space-y-4 border-t border-background-offset pt-8">
            <h2 class="text-xl font-semibold tracking-tight">
              Catalog of AI use
            </h2>
            <ul class="space-y-5">
              <TransparencyLogEntry
                date="2026-11-16"
                title="About page AI Usage section."
              >
                Added an AI Usage section to the About page linking here.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-16"
                title="AI transparency log format."
              >
                Introduced the dated log format and the{" "}
                <code class="font-mono text-sm">TransparencyLogEntry</code>{" "}
                component. Going forward, major agent-driven changes land here
                with a date and short summary.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-16"
                title="Frontend scaffolding."
              >
                Initial pages, Tailwind styling, and component skeletons for the
                index, About, Discord, and settings pages were drafted with an
                LLM and revised by hand.
              </TransparencyLogEntry>
              <TransparencyLogEntry date="2026-11-16" title="Mock course data.">
                Placeholder lesson titles, time estimates, and importance tags
                in the course catalog were generated as mock content and will be
                replaced with real curriculum as it's written.
              </TransparencyLogEntry>
              <TransparencyLogEntry date="2026-11-15" title="User management.">
                Temporary, needs thorough verification before going out to real
                users.
              </TransparencyLogEntry>
            </ul>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}
