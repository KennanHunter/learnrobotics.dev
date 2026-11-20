export type CodePromptBundleInput = {
  lessonMarkdown: string;
  /** Code from the student's editor. */
  code?: string;
  /** Language fence for the code block. Defaults to java. */
  codeLanguage?: string;
  /** Compiler/runtime output. */
  output?: string;
  /** Overrides DEFAULT_CODE_SYSTEM_PROMPT when set to a non-empty string. */
  systemPrompt?: string | null;
};

export const DEFAULT_CODE_SYSTEM_PROMPT = `You are helping a FIRST robotics student with a programming lesson. Read the lesson goal, their code, and the output below, then figure out what's going wrong.

Do explain the underlying concept and why their code behaves the way it does. Do help with syntax errors, pointing to the line and explaining the rule. Do ask a guiding question if they're close. Don't write the corrected code or give a full solution. Short snippets illustrating a concept are okay; their lesson code is not.

Your goal is for them to fix it themselves and understand why.`;

export function buildCodePromptBundle(input: CodePromptBundleInput): string {
  const lang = input.codeLanguage ?? "java";
  const code = input.code ?? "// (no code yet)";
  const output = input.output ?? "(no output yet)";
  const systemPrompt = input.systemPrompt?.trim() || DEFAULT_CODE_SYSTEM_PROMPT;

  return [
    systemPrompt,
    "",
    "## Lesson goal",
    "",
    input.lessonMarkdown.trim(),
    "",
    "## My code",
    "",
    "```" + lang,
    code,
    "```",
    "",
    "## What happened",
    "",
    output,
    "",
  ].join("\n");
}
