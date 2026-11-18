import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ReadingLesson } from "@learnrobotics/editor";
import { Opinion } from "@learnrobotics/editor/mdx";
import { LoremIpsum } from "@learnrobotics/content/components/LoremIpsum";

function Body() {
  return (
    <>
      <LoremIpsum paragraphs={2} />
      <Opinion>
        Testing by hand first teaches you what a good test even looks like.
      </Opinion>
      <LoremIpsum paragraphs={1} />
    </>
  );
}

const meta = {
  component: ReadingLesson,
} satisfies Meta<typeof ReadingLesson>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {
  args: {
    title: "An introduction to the editor",
    Body,
    markdownUrl: "data:text/plain,Sample%20markdown%20body",
    prev: { href: "#prev", title: "Orientation" },
    next: { href: "#next", title: "Why Java" },
  },
};

export const FirstLesson: Story = {
  args: {
    title: "An introduction to the editor",
    Body,
    markdownUrl: "data:text/plain,Sample%20markdown%20body",
    next: { href: "#next", title: "Why Java" },
  },
};

export const LastLesson: Story = {
  args: {
    title: "Capstone: finish your adventure",
    Body,
    markdownUrl: "data:text/plain,Sample%20markdown%20body",
    prev: { href: "#prev", title: "Parsing commands" },
  },
};
