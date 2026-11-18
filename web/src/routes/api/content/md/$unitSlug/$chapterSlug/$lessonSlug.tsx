import { createFileRoute } from "@tanstack/solid-router";
import { renderToStringAsync } from "solid-js/web";
import TurndownService from "turndown";
import {
  buildIndexableLesson,
  buildReadingCopyBundle,
} from "@learnrobotics/editor";
import { MarkdownRenderContext } from "@learnrobotics/editor/mdx";
import { findLesson, getContentIndex } from "~/lib/content";
import { getLocale, localizeHref } from "~/paraglide/runtime";

// Shared turndown instance. Configured once; we never mutate it per request.
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

const handler = async ({
  request,
  params,
}: {
  request: Request;
  params: { unitSlug: string; chapterSlug: string; lessonSlug: string };
}) => {
  const hit = findLesson(
    getContentIndex(getLocale()),
    params.unitSlug,
    params.chapterSlug,
    params.lessonSlug,
  );
  if (!hit) return new Response("lesson not found", { status: 404 });

  const Body = hit.lesson.Body;
  const html = await renderToStringAsync(() => (
    <MarkdownRenderContext.Provider value={true}>
      <Body />
    </MarkdownRenderContext.Provider>
  ));
  const lessonMarkdown = turndown.turndown(html);

  const url = new URL(request.url);
  const mode = url.searchParams.get("for");
  const lessonPath = localizeHref(
    `/units/${params.unitSlug}/${params.chapterSlug}/${params.lessonSlug}`,
  );
  const lessonUrl = `${url.origin}${lessonPath}`;

  const payload =
    mode === "copy"
      ? buildReadingCopyBundle({
          lessonTitle: hit.lesson.title,
          lessonMarkdown,
        })
      : buildIndexableLesson({
          lessonTitle: hit.lesson.title,
          lessonMarkdown,
          lessonUrl,
        });

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};

export const Route = createFileRoute(
  "/api/content/md/$unitSlug/$chapterSlug/$lessonSlug",
)({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
