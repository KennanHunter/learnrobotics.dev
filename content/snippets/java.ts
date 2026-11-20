import { defineSnippet } from "../lib/define";

export const javaClass = defineSnippet({
  title: "Java Class",
  language: "java",
  body: ["class Example {", "\tExample() {", "\t}", "}"],
});
