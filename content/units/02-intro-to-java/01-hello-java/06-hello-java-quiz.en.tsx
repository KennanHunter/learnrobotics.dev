// Placeholder questions — seeded for UI verification. Author will replace
// with real pedagogy; keep ids stable if the shape of a question changes.
import { defineLesson, defineQuestion } from "../../../lib/define";

export const printlnOutput = defineQuestion({
  id: "println-output",
  kind: "multiple-choice",
  prompt: (
    <>
      What does{" "}
      <code>System.out.println("Hello, robot!")</code> print to the console?
    </>
  ),
  choices: [
    <code>Hello, robot!</code>,
    <code>"Hello, robot!"</code>,
    <code>println</code>,
    <>Nothing — this line throws a compile error.</>,
  ],
  answer: 0,
});

export const classKeyword = defineQuestion({
  id: "class-keyword",
  kind: "multiple-choice",
  prompt: <>Which keyword starts the definition of a Java class?</>,
  choices: [<code>def</code>, <code>function</code>, <code>class</code>, <code>new</code>],
  answer: 2,
});

export const orderOfExecution = defineQuestion({
  id: "order-of-execution",
  kind: "drag-to-reorder",
  prompt: (
    <>
      Drag the lines into the order they'd run in a typical{" "}
      <code>main</code> method.
    </>
  ),
  items: [
    <>Declare a variable</>,
    <>Assign it a value</>,
    <>Print the variable</>,
    <>Return from <code>main</code></>,
  ],
});

export const writeMainMethod = defineQuestion({
  id: "write-main-method",
  kind: "code-unit-test",
  prompt: (
    <>
      Write a <code>main</code> method that prints the number{" "}
      <code>42</code>.
    </>
  ),
});

export default defineLesson({
  id: "hello-java-quiz",
  title: "Hello Java checkpoint",
  kind: "quiz",
  estMinutes: 8,
  difficulty: 1,
  importance: "essential",
  questions: [printlnOutput, classKeyword, orderOfExecution, writeMainMethod],
});
