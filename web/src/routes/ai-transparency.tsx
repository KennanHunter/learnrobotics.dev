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
              TLDR: Content is human-written. AI is used for scoped and
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
                Use my experience as a <FIRST /> alum to understand what
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
              The best example of my process is probably the runtime which runs
              Java in the browser. On paper I knew exactly how it should work,
              but in practice the first library was way too slow, the next was
              too heavy, and the JDK itself was huge and required some
              optimizations. With AI I could try all three end to end in a day
              instead of burning a week on each. Honestly, spending that much
              time on approaches I was going to throw out would’ve just been
              time not spent on lessons. The approach that stuck, I’ve gone
              through myself and understand well, because if it breaks, students
              can’t do anything. A lot of the smaller stuff in this project
              works the same way.
            </p>

            <p class="text-foreground-muted">
              As an industry as a whole, one of my biggest fears is that
              students and junior devs who are building for the first time with
              expert-level programmers in their terminal will miss out on the
              hard lessons: the days tracing annoying errors or the error in
              prod you spend a frantic hour fixing. Doing these myself I think
              built my debugging and analysis skills much better than if I had
              AI at the time.
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
              looming deadline of the Systemcore release, where this course will
              be uniquely helpful to students, especially FTC students using
              WPILib for the first time.
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
              a way that quality is confirmed either with tests or is low-stakes
              enough that small imperfections don't matter (like a placeholder
              page).
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
              Catalog of AI use (generated automatically)
            </h2>
            <p class="text-foreground-muted">
              Unfortunately generating a log of manual programming is a lot
              harder. Every step here contains a lot of manual verification and
              fixing.
            </p>

            <ul class="space-y-5">
              <TransparencyLogEntry
                date="2026-11-18"
                title="Replay play/pause/seek UI stubs in the workbench toolbar."
              >
                Added a non-functional <code>ReplayControls</code> component
                (play/pause toggle + range slider + percent readout) in{" "}
                <code>packages/editor/src/Panels/</code> and wired it into
                both the <code>JavaCodeRunner</code> and{" "}
                <code>MarkdownRunner</code> toolbars in place of the Run
                button. The Run/Stop affordances were removed from the
                toolbar — the store's <code>onRun</code>/<code>onStop</code>
                still exist for when a run surface lands elsewhere. Pure UI
                placeholder; no recorder or player is attached yet.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Quiz submission, hints, resubmission + a11y + palette fixes."
              >
                Finished the long-planned quiz submit flow: on submit the page
                scrolls to the top, where the progress bar is replaced by a
                summary panel showing counts of correct and incorrect answers
                plus a Retake button. Submission is no longer terminal —
                questions a learner got right lock, questions they got wrong
                stay editable and surface an optional author-authored{" "}
                <code>hint</code> (new field on{" "}
                <code>MultipleChoiceQuestion</code>/
                <code>DragReorderQuestion</code>) so the learner can rework
                the answer and resubmit. The correct answer is deliberately
                not revealed. The summary is a <code>role="status"</code>{" "}
                live region and pulls focus on mount so screen reader users
                hear the result after submit. Multiple-choice panes are now
                proper ARIA radio groups (<code>role=radiogroup</code> /{" "}
                <code>role=radio</code> with <code>aria-checked</code>, roving
                <code> tabindex</code>, and arrow/Home/End key navigation)
                instead of a plain pile of buttons. Also ported the quiz UI
                off Tailwind's default{" "}
                <code>accent</code>/<code>emerald</code>/<code>rose</code>{" "}
                palette names (which resolved to nothing under this project's{" "}
                <code>--color-*: initial</code> reset — SVG was literally
                rendering black) onto the project's real{" "}
                <code>blue</code>/<code>green</code>/<code>red</code> tokens,
                and registered <code>packages/editor/src</code> as a Tailwind{" "}
                <code>@source</code> so classes in the editor package actually
                get emitted.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Citation primitive for MDX lessons."
              >
                Added a <code>&lt;Citation&gt;</code> MDX component
                (<code>@learnrobotics/content/components/Citation</code>) that
                authors drop inline with <code>href</code>, <code>title</code>,
                and <code>description</code> props. It renders a numbered
                superscript marker like <code>[1]</code> that jumps to a
                "Citations" section auto-collected and rendered at the bottom
                of every reading lesson. A <code>CitationsProvider</code> +
                <code>CitationList</code> pair is wired into the{" "}
                <code>ReadingLesson</code> variant once, so lessons get the
                section for free without extra boilerplate; registrations are
                deduped by id so re-citing the same source reuses its number.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Quiz system scaffolding."
              >
                Rebuilt the quiz pipeline end-to-end. Quiz lessons are now{" "}
                <code>.tsx</code> files in <code>/content</code>: the default
                export is a <code>defineLesson({"{ kind: \"quiz\", … }"})</code>{" "}
                whose <code>questions</code> array is inline, and each question
                is a named export built with <code>defineQuestion</code> so
                placement-test files can pull individual questions with full
                type-safety (<code>HelloJavaQuiz.testPrinting</code>). The
                question union covers multiple-choice, drag-to-reorder, and a
                stubbed code-and-pass-unit-test kind. A new{" "}
                <code>@learnrobotics/editor/variants/quiz</code> Variant
                (store + MC/drag/stub/results panes) renders the lesson,
                reusing existing <code>LessonNav</code> and{" "}
                <code>MarkdownCopy</code>. Results persist to a new{" "}
                <code>quiz_result</code> table in D1 as a JSON blob (one row
                per attempt); on reload the route fetches the union of
                correctly-answered question ids and hides them on retake.
                Four existing <code>.mdx</code> quiz stubs were renamed to{" "}
                <code>.tsx</code> with <code>questions: []</code> — the
                author still owns the pedagogy. Placement test has a minimal{" "}
                <code>definePlacementTest</code> helper only; its page and
                content are a follow-up, as is the real test runner for
                code-and-pass questions.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Editor project persistence schema."
              >
                Added a <code>project</code> table to{" "}
                <code>@learnrobotics/db</code> (id, userId, title, nullable
                starterId, activeFile, files JSON blob, timestamps; FK
                cascades on user delete so the anonymous-user cleanup cron
                sweeps unclaimed drafts). Pure data functions in{" "}
                <code>packages/db/src/data/projects.ts</code> cover list,
                get, create, update, delete, and{" "}
                <code>migrateProjectsOwner</code>; the better-auth{" "}
                <code>onLinkAccount</code> hook now calls that migration so
                projects a user saved while anonymous follow them into
                their GitHub-linked account. Thin{" "}
                <code>createServerFn</code> endpoints live in{" "}
                <code>web/src/server/projects.ts</code> behind{" "}
                <code>requireUser()</code> and a valibot validator (title
                /activeFile length caps; files blob capped at 512 KB). Not
                yet wired to the editor — <code>CodeRunnerShell</code>'s{" "}
                <code>autoSaveId</code> prop will swap{" "}
                <code>DraftPersist</code>'s localStorage for these
                endpoints in a follow-up.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="DB layer extracted to @learnrobotics/db."
              >
                Pulled schema, drizzle client, BetterAuth config, data
                functions, entity types, and the user/editor Solid contexts
                into a new <code>packages/db</code> workspace package
                (<code>@learnrobotics/db</code>). UI components import
                hooks and types from the main entry;{" "}
                <code>UserDataProvider</code> replaces the former
                <code>SessionProvider</code> + <code>ThemeProvider</code> pair
                and now owns session, config, and derived theme in one
                context. <code>EditorDataProvider</code> is mounted as a stub
                for the upcoming workbench state. Server functions
                (<code>createServerFn</code>) stay in <code>web/src/server/</code>{" "}
                because TanStack&apos;s server-fn stripping doesn&apos;t cross
                workspace boundaries; they&apos;re thin wrappers over the
                package&apos;s pure data functions. Split subpath exports
                (<code>/server</code> for DB primitives, <code>/data</code>{" "}
                for data fns + guards) keep the client bundle clean.
                <code>drizzle.config.ts</code> now points at the package
                schema path.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Playground Stop button."
              >
                Added a Stop button next to Run on <code>/playground</code>{" "}
                that terminates the code-runner worker mid-execution. The
                ristretto VM has no in-band cancel, so interrupting a
                runaway program means tearing down the worker and letting
                the next Run spin up a fresh one.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Content package + runtime markdown projection."
              >
                Moved <code>/content</code> into its own workspace package
                (<code>@learnrobotics/content</code>) so it can declare
                Solid and MDX dependencies directly, and exposed the lesson
                index builder as <code>createContentRegistry</code>. The
                plain-markdown projection consumed by the LLM output path
                moved from a build-time MDX AST walk to a request-time
                pipeline: SSR the lesson with a{" "}
                <code>MarkdownRenderContext</code> flag set, then run the
                HTML through turndown. New components (and interactive
                figures) don&apos;t need bespoke AST handlers &mdash; they
                either render semantic HTML or check{" "}
                <code>useIsMarkdownRender()</code> to emit a summary variant.
                Added a <code>LoremIpsum</code> filler component that imports
                its sibling <code>.md</code> file and an <code>Opinion</code>{" "}
                callout that round-trips through turndown as a labeled
                blockquote. Deleted <code>strip-mdx.ts</code> and{" "}
                <code>mdx-markdown.ts</code>.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Top bar mobile layout + status-icon reuse."
              >
                On narrow viewports the top bar now collapses the full{" "}
                <code>Logo</code> to the compact <code>LogoSquare</code> and
                moves the breadcrumb navigator to a second row under the
                administrative chrome. Height is reported to the overlay system
                via a <code>ResizeObserver</code> that writes{" "}
                <code>--topbar-h</code> on the document element, so the grid
                overlay still lands cleanly below the top bar when it grows. The
                breadcrumb panel now shows lesson state with the shared{" "}
                <code>StatusIcon</code> (same checkmark treatment as the course
                index) instead of a bespoke dot. Added mobile stories for both{" "}
                <code>TopBar</code> (390px and 320px frames, with/without
                crumbs) and <code>BreadcrumbNav</code> (inline panel +
                opened-over-host narrow views).
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-18"
                title="Overlay system + breadcrumb mega-menu."
              >
                Reworked <code>ModalManager</code> into a grid-based overlay
                system. The provider now renders a 12&times;12 grid pinned below
                the top bar (via <code>--topbar-h</code>) and{" "}
                <code>open()</code> takes options: <code>variant</code> (
                <code>modal</code> / <code>panel</code> / <code>bare</code>),{" "}
                <code>size</code> (<code>sm</code>&hellip;<code>full</code>
                ), <code>anchor</code> (nine named positions), or explicit{" "}
                <code>placement</code> with raw grid coords. Backdrop and
                dismiss behavior are per-call toggles. Lesson pages&apos;
                breadcrumb now opens through this system as a <code>panel</code>{" "}
                at <code>top-end</code>, with a reworked layout (Unit / Chapter
                on top, Lesson full-width below) and a subtler paper-style
                callout around the reading pane. Added extensive Storybook
                stories covering every size, anchor, variant, backdrop/dismiss
                combination, and the breadcrumb panel itself (default, deep
                unit, long titles, inline, all-done).
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="Extracted editor + events into workspace packages."
              >
                Moved the Monaco glue out of{" "}
                <code>web/src/components/editor/</code> into{" "}
                <code>packages/editor/</code> (new workspace package{" "}
                <code>@learnrobotics/editor</code>). Added a sibling{" "}
                <code>packages/events/</code> (
                <code>@learnrobotics/events</code>) with the{" "}
                <code>ReplayEvent</code> schema, JSON-lines codec, and a single{" "}
                <code>EventDispatcher</code> chokepoint for all future event
                sources. The editor exposes a <code>bindRecorder</code> helper
                that funnels Monaco edit/cursor/selection changes into the
                dispatcher; the playground wires it unconditionally so setting{" "}
                <code>localStorage.events:trace = "1"</code> prints a trace line
                per event. No replay UI, no routes, and no behavior change yet —
                this is the first slice of a larger event-record/replay feature.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="Admin users page: search + per-user detail dropdown."
              >
                The <code>/admin/users</code> route now accepts an optional{" "}
                <code>?q=</code> search param that filters by name, email, or
                user id (server-side LIKE, escaped). Rows are clickable and
                expand inline to a three-column detail panel: identity (id,
                verified, timestamps), linked accounts + user config, and
                session activity (active count, last-seen, 10 most recent
                sessions with IP/UA/expiry). Powered by a new{" "}
                <code>getUserDetails</code> server function in{" "}
                <code>web/src/server/admin.ts</code>; the virtualizer now
                measures per-row so expanded entries push subsequent rows down
                instead of overlapping.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="GitHub repo link in the top bar."
              >
                Added a repository link (<code>AiFillGithub</code> icon, same
                button styling as the theme toggle) immediately left of the
                theme toggle in <code>TopBar</code>, pointing at{" "}
                <code>github.com/kennanhunter/learnrobotics.dev</code>.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="Versioned R2 CORS + infra-security workflow."
              >
                Added <code>infra/r2-cors-learn-robotics-dev-storage.json</code>{" "}
                as the checked-in CORS policy for the bundles bucket
                (allow-listing production, <code>www</code>,{" "}
                <code>preview.learnrobotics.dev</code>, and{" "}
                <code>localhost:5173</code>), and a new{" "}
                <code>infra-security</code> GitHub Actions workflow that
                reapplies every policy in <code>infra/</code> via wrangler on
                push. Needed because the browser follows the
                <code> /api/bundles/:kind/:pin</code> 302 to R2's origin, where
                CORS is evaluated against the bucket — not the worker.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="Collapse bundle authoring into one CLI."
              >
                Merged the per-package <code>scripts/*.mjs</code> files (teavm
                mirror/stage, runtime-bundle build/upload) into a single CLI at{" "}
                <code>packages/bundling/bin/cli.mjs</code> with subcommands{" "}
                <code>mirror-teavm</code>, <code>stage-teavm</code>,{" "}
                <code>build-jdk</code>, <code>upload-runtime</code>, and{" "}
                <code>ci</code>. The GitHub Actions workflow and justfile
                targets now both call{" "}
                <code>node packages/bundling/bin/cli.mjs</code>, so local and CI
                runs are the same code path. Deleted the empty{" "}
                <code>webassembly/runtime-bundles</code> workspace package;
                intermediate artifacts now land in{" "}
                <code>packages/bundling/dist</code>. Also fixed a wrong Corretto
                pin (<code>25.0.5.11.1</code> → <code>25.0.5.1.2</code>) that
                was 403ing in CI.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="Shared bundling package + admin bundle inventory."
              >
                Extracted R2 primitives (creds, AWS client, HEAD-checked upload,
                signed GET, ListObjectsV2) into a new workspace package{" "}
                <code>@learnrobotics/bundling</code> at{" "}
                <code>packages/bundling</code>. Both the teavm-javac mirror and
                the runtime-bundle pipeline now call into the same helpers;
                their <code>config.mjs</code> /<code> upload.mjs</code> /{" "}
                <code>stage.mjs</code> dropped to a dozen lines each. Added an
                admin panel at <code>/admin/bundles</code> that lists every
                bundle object in R2 — kind, pin, filename, size, upload time,
                ETag — grouped by source prefix, backed by a new{" "}
                <code>listBucketObjects</code> helper in{" "}
                <code>web/src/server/r2.ts</code>.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="JDK and runtime-dependency pipeline on R2."
              >
                Renamed <code>crates/compiler</code> + the matching
                <code> @learnrobotics/compiler</code> JS package to
                <code> runtime</code> — the ristretto-backed wasm actually runs
                classes rather than producing them, and teavm already owns the
                Java-to-class step. Taught the runtime to accept a{" "}
                <code>java_home</code> preopen path + extra classpath entries so
                it stops trying to download a JDK over <code>wasi:http</code>{" "}
                (which the browser's preview2 shim doesn't serve). Added a
                general, pinned "runtime bundle" pipeline: the{" "}
                <code>packages/bundling</code> CLI builds and pushes archives to
                R2 under
                <code> bundles/&lt;kind&gt;/&lt;pin&gt;/</code>; the browser lib
                at <code>web/src/lib/bundles</code> fetches via
                <code> /api/bundles/:kind/:pin</code>, caches the bytes in
                IndexedDB, un-tars into the WASI virtual FS, and hands the mount
                paths to the runtime. JDK is the first bundle; WPILib and custom
                façades plug into the same kind/pin shape.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-17"
                title="File tree component (ported from monaco-tree)."
              >
                Ported the{" "}
                <a
                  class="underline"
                  href="https://github.com/BlueMagnificent/monaco-tree"
                >
                  monaco-tree
                </a>{" "}
                React proof-of-concept into a Solid component living at
                <code> web/src/components/FileTree</code>. The data model,
                directory-tree generator, file-icon mapping, drag-and-drop
                rules, and the vscode-icons SVG set were ported from the
                original; the tree widget itself is reimplemented in Solid
                against the app's Tailwind theme (the upstream relied on
                internal monaco 0.20 APIs that no longer exist in 0.57).
                Filesystem mutations are left as callbacks — the component emits
                intent rather than persisting anything. Headline deliverable is
                a Storybook file with 17 stories for visual fidelity.
              </TransparencyLogEntry>
              <TransparencyLogEntry
                date="2026-11-16"
                title="Playground compile + run moved off the main thread."
              >
                The Java compiler (teavm-javac) and the ristretto runtime now
                run inside a dedicated Web Worker, so compiling and running user
                code no longer freezes the editor. The playground UI reflects a
                three-state phase (idle / compiling / running) on the Run
                button, and logs stream from the worker as they are emitted.
                Also mirrored the teavm-javac build artifacts to R2 so the build
                stops depending on teavm.org being up.
              </TransparencyLogEntry>
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
