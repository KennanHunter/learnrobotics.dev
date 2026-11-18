import { createFileRoute } from "@tanstack/solid-router";
import { getContentIndex } from "~/lib/content";
import { getLocale } from "~/paraglide/runtime";

const SITE_TITLE = "learnrobotics.dev";
const SITE_SUMMARY =
  "Learn FIRST robotics programming in the browser. Hand-written lessons covering Java fundamentals, tank drive, swerve, end effectors, and controls theory.";

function buildLlmsTxt(origin: string, locale: string): string {
  const index = getContentIndex(locale as never);
  const base = `${origin}/${locale}`;

  const lines: string[] = [];
  lines.push(`# ${SITE_TITLE}`);
  lines.push("");
  lines.push(`> ${SITE_SUMMARY}`);
  lines.push("");
  lines.push(
    "Every lesson is also published as plain markdown at `/api/content/md/<unit>/<chapter>/<lesson>` for direct consumption by coding agents.",
  );
  lines.push("");

  for (const unit of index.units) {
    lines.push(`## ${unit.title}`);
    lines.push("");
    lines.push(`> ${unit.blurb}`);
    lines.push("");
    for (const chapter of unit.chapters) {
      for (const lesson of chapter.lessons) {
        const mdUrl = `${origin}/${locale}/api/content/md/${unit.slug}/${chapter.slug}/${lesson.slug}`;
        const note = [
          chapter.title,
          lesson.kind,
          `${lesson.estMinutes}m`,
          lesson.importance,
        ].join(" · ");
        lines.push(`- [${lesson.title}](${mdUrl}): ${note}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

const handler = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const body = buildLlmsTxt(url.origin, getLocale());
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};

export const Route = createFileRoute("/api/llms")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
