import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Code } from "./Code";

const meta = {
  component: Code,
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

const javaSample = `public class HelloWorld {
  // A classic first program.
  public static void main(String[] args) {
    String greeting = "Hello, world!";
    for (int i = 0; i < 3; i++) {
      System.out.println(greeting + " (" + i + ")");
    }
  }
}`;

const markdownSample = `# Variables in Java

A **variable** is a named box that stores a value.

- Integers live in \`int\`
- Decimal numbers live in \`double\`

\`\`\`java
int age = 17;
\`\`\`

See [the docs](https://docs.oracle.com/javase/tutorial/) for more.`;

export const JavaBlock: Story = {
  args: { language: "java", children: javaSample },
};

export const MarkdownBlock: Story = {
  args: { language: "markdown", children: markdownSample },
};

export const InlineJava: Story = {
  render: () => (
    <p class="text-base">
      Declare a counter with{" "}
      <Code inline language="java">{`int i = 0;`}</Code> before starting the
      loop.
    </p>
  ),
};

export const InlineMarkdown: Story = {
  render: () => (
    <p class="text-base">
      Wrap a word in asterisks to make it bold:{" "}
      <Code inline language="markdown">{`**like this**`}</Code>.
    </p>
  ),
};

export const BlockAndInlineTogether: Story = {
  render: () => (
    <div class="flex max-w-prose flex-col gap-4 text-base">
      <p>
        A <Code inline language="java">{`for`}</Code> loop runs a block of code
        a known number of times. Here's the canonical shape:
      </p>
      <Code language="java">{`for (int i = 0; i < 10; i++) {
  System.out.println(i);
}`}</Code>
      <p>
        The three parts inside the parentheses are the{" "}
        <Code inline language="java">{`init`}</Code>,{" "}
        <Code inline language="java">{`condition`}</Code>, and{" "}
        <Code inline language="java">{`update`}</Code> expressions.
      </p>
    </div>
  ),
};

export const LongLines: Story = {
  args: {
    language: "java",
    children: `String reallyLongVariableName = "this line is intentionally very long so we can see how the block scrolls horizontally instead of wrapping and breaking the layout";`,
  },
};
