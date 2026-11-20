import { defineSnippet } from "../lib/define";

export const header = defineSnippet({
  title: "Header",
  language: "markdown",
  body: ["# This is a Header!"],
});

export const emphasis = defineSnippet({
  title: "Bold & Italic",
  language: "markdown",
  body: ["*italic text*", "**bold text**", "***bold and italic***"],
});

export const bulletedList = defineSnippet({
  title: "Bulleted List",
  language: "markdown",
  body: ["- first item", "- second item", "- third item"],
});

export const link = defineSnippet({
  title: "Link",
  language: "markdown",
  body: ["[link text](https://learnrobotics.dev)"],
});

export const codeBlock = defineSnippet({
  title: "Code Block",
  language: "markdown",
  body: ["```java", 'System.out.println("Hello!");', "```"],
});
