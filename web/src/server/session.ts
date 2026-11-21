import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  requireUser,
  summarizeSession,
  writeCodeSystemPrompt,
  writeMonacoTheme,
  writeShowMarkdownCopy,
  writeSystemPrompt,
  writeTabSize,
  writeTheme,
} from "@learnrobotics/db/data";
import type { SessionSummary } from "@learnrobotics/db";
import { THEME_IDS } from "~/lib/monaco-themes";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "session" });

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSummary> => {
    const user = await requireUser();
    const summary = await summarizeSession(user);
    log.debug({ summary }, "getSession returning");
    return summary;
  },
);

const SetThemeSchema = v.object({
  theme: v.nullable(v.picklist(["light", "dark"])),
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetThemeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, theme: data.theme },
      "setTheme: persisting app theme",
    );
    await writeTheme(user.id, data.theme);
    return { theme: data.theme };
  });

const SetMonacoThemeSchema = v.object({
  monacoTheme: v.nullable(v.picklist(THEME_IDS as [string, ...string[]])),
});

export const setMonacoTheme = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetMonacoThemeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, monacoTheme: data.monacoTheme },
      "setMonacoTheme: persisting editor theme",
    );
    await writeMonacoTheme(user.id, data.monacoTheme);
    return { monacoTheme: data.monacoTheme };
  });

const SetTabSizeSchema = v.object({
  tabSize: v.nullable(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(64)),
  ),
});

export const setTabSize = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetTabSizeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, tabSize: data.tabSize },
      "setTabSize: persisting editor tab size",
    );
    await writeTabSize(user.id, data.tabSize);
    return { tabSize: data.tabSize };
  });

const SetShowMarkdownCopySchema = v.object({
  showMarkdownCopy: v.nullable(v.boolean()),
});

export const setShowMarkdownCopy = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetShowMarkdownCopySchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, showMarkdownCopy: data.showMarkdownCopy },
      "setShowMarkdownCopy: persisting Copy Markdown visibility",
    );
    await writeShowMarkdownCopy(user.id, data.showMarkdownCopy);
    return { showMarkdownCopy: data.showMarkdownCopy };
  });

// Caps the stored override so a pasted megabyte of text can't balloon the
// session summary; well above a realistic hand-authored prompt.
const SYSTEM_PROMPT_MAX = 8000;

const SetSystemPromptSchema = v.object({
  systemPrompt: v.nullable(v.pipe(v.string(), v.maxLength(SYSTEM_PROMPT_MAX))),
});

export const setSystemPrompt = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetSystemPromptSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    // Empty/whitespace-only string == clear the override.
    const value = data.systemPrompt?.trim() ? data.systemPrompt : null;
    log.info(
      { userId: user.id, length: value?.length ?? 0 },
      "setSystemPrompt: persisting reading-copy system prompt",
    );
    await writeSystemPrompt(user.id, value);
    return { systemPrompt: value };
  });

const SetCodeSystemPromptSchema = v.object({
  codeSystemPrompt: v.nullable(
    v.pipe(v.string(), v.maxLength(SYSTEM_PROMPT_MAX)),
  ),
});

export const setCodeSystemPrompt = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetCodeSystemPromptSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const value = data.codeSystemPrompt?.trim() ? data.codeSystemPrompt : null;
    log.info(
      { userId: user.id, length: value?.length ?? 0 },
      "setCodeSystemPrompt: persisting code-lesson system prompt",
    );
    await writeCodeSystemPrompt(user.id, value);
    return { codeSystemPrompt: value };
  });
