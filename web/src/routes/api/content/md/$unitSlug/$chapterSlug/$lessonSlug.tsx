import { createFileRoute } from "@tanstack/solid-router";
import { renderToStringAsync } from "solid-js/web";
import {
  buildIndexableLesson,
  buildReadingCopyBundle,
} from "@learnrobotics/editor";
import { MarkdownRenderContext } from "@learnrobotics/editor/mdx";
import {
  CitationList,
  CitationsProvider,
} from "@learnrobotics/content/components/Citation";
import { requireUser, summarizeSession } from "@learnrobotics/db/data";
import { findLesson, getContentIndex } from "~/lib/content";
import { htmlToMarkdown } from "~/lib/html-to-markdown";
import { getLocale, localizeHref } from "~/paraglide/runtime";

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
  // Mirror ReadingLesson's wrapper tree so components that depend on a
  // provider (currently <Citation>, which registers against <CitationsProvider>)
  // don't throw during the markdown projection render.
  const html = await renderToStringAsync(() => (
    <MarkdownRenderContext.Provider value={true}>
      <CitationsProvider>
        <Body />
        <CitationList />
      </CitationsProvider>
    </MarkdownRenderContext.Provider>
  ));
  const lessonMarkdown = await htmlToMarkdown(html);

  const url = new URL(request.url);
  const mode = url.searchParams.get("for");
  const lessonPath = localizeHref(
    `/units/${params.unitSlug}/${params.chapterSlug}/${params.lessonSlug}`,
  );
  const lessonUrl = `${url.origin}${lessonPath}`;

  let payload: string;
  if (mode === "copy") {
    const summary = await summarizeSession(await requireUser());
    payload = buildReadingCopyBundle({
      lessonTitle: hit.lesson.title,
      lessonMarkdown,
      systemPrompt: summary?.systemPrompt ?? null,
    });
  } else {
    payload = buildIndexableLesson({
      lessonTitle: hit.lesson.title,
      lessonMarkdown,
      lessonUrl,
    });
  }

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
