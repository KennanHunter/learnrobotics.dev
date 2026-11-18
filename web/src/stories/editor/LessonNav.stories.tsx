import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { LessonNav } from "@learnrobotics/editor";

const meta = {
  component: LessonNav,
} satisfies Meta<typeof LessonNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Both: Story = {
  args: {
    prev: { href: "#prev", title: "Why Java" },
    next: { href: "#next", title: "History of Java and why it exists" },
  },
};

export const OnlyNext: Story = {
  args: {
    next: { href: "#next", title: "Why Java" },
  },
};

export const OnlyPrev: Story = {
  args: {
    prev: { href: "#prev", title: "Parsing commands" },
  },
};
