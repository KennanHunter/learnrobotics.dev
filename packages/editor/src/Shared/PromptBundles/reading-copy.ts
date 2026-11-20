export type ReadingCopyBundleInput = {
  lessonTitle: string;
  lessonMarkdown: string;
  /** Overrides DEFAULT_SYSTEM_PROMPT when set to a non-empty string. */
  systemPrompt?: string | null;
};

export const DEFAULT_SYSTEM_PROMPT = `I'm a high-school FIRST Robotics student working through a lesson from learnrobotics.dev. Please help me understand it.

For this whole conversation:
- Explain things in a way that reinforces the article, and point me to sections by heading when relevant.
- Don't contradict the article. If I ask something it doesn't cover, answer briefly and say it's outside the lesson.
- Keep answers short (2–5 sentences) unless I ask for more.
- If I haven't asked a question yet, ask what I'd like to know.`;

export function buildReadingCopyBundle(input: ReadingCopyBundleInput): string {
  const systemPrompt = input.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

  return [
    systemPrompt,
    "",
    `<article title="${input.lessonTitle.replace(/"/g, "&quot;")}">`,
    input.lessonMarkdown.trim(),
    "</article>",
    "",
    "My question:",
    "",
  ].join("\n");
}
