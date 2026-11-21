import { defineLesson, defineQuestion } from "../../../lib/define";

export const printlnOutput = defineQuestion({
  id: "println-output",
  kind: "multiple-choice",
  prompt: <>Quizzes are meant to:</>,
  choices: [
    <>Make you feel bad</>,
    <>Prove you're stupid</>,
    <>Help you identify where you can still learn</>,
  ],
  answer: 2,
});

export const classKeyword = defineQuestion({
  id: "class-keyword",
  kind: "multiple-choice",
  prompt: <>Which is NOT a lesson importance classifier used in our courses</>,
  choices: ["essential", "useful", "niche", "pointless"],
  answer: 3,
});

// TODO: We can do "put the courses in order" once we have more than two courses lol
export const orderOfExecution = defineQuestion({
  id: "order-of-execution",
  kind: "drag-to-reorder",
  prompt: (
    <>This is a drag question. You won't see it often, put them in order.</>
  ),
  items: [<>A</>, <>B</>, <>C</>, <>D</>],
});

export const writeMarkdown = defineQuestion({
  id: "write-markdown",
  kind: "code-markdown",
  prompt: (
    <>
      Write a <code>simple markdown file</code> that explains your reasoning for
      wanting to code.
    </>
  ),
  test: (content) => {
    if (content.length > 0) {
      return "Congrats! You wrote something.";
    } else {
      return "At least write something...";
    }
  },
});

export default defineLesson({
  id: "quiz-introduction",
  title: "An introduction to quizzes",
  kind: "quiz",
  estMinutes: 8,
  difficulty: 1,
  importance: "essential",
  questions: [printlnOutput, classKeyword, orderOfExecution, writeMarkdown],
});
