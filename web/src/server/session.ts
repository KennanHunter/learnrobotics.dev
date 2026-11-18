import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  requireUser,
  summarizeSession,
  writeMonacoTheme,
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
