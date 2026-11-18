export type ReadingCopyBundleInput = {
  lessonTitle: string;
  lessonMarkdown: string;
};

const SYSTEM_PROMPT = `You are helping a FIRST robotics student. The content below is a reading lesson from learnrobotics.dev — a plain-markdown article. Read it, then answer the student's question that follows the marker at the end.

Explain concepts in a way that reinforces the article. Point back to specific sections of the article when relevant. Don't invent material that contradicts the article. Keep answers concise.`;

export function buildReadingCopyBundle(
  input: ReadingCopyBundleInput,
): string {
  return [
    SYSTEM_PROMPT,
    "",
    `## Lesson article: ${input.lessonTitle}`,
    "",
    input.lessonMarkdown.trim(),
    "",
    "---",
    "",
    "## Student question",
    "",
    "(The student's question begins below this line.)",
    "",
  ].join("\n");
}
