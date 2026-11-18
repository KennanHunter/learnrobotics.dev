import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Callout } from "@learnrobotics/editor/mdx";

const meta = {
  component: Callout,
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Note: Story = {
  args: {
    kind: "note",
    children: "Heads up: Java strings are immutable.",
  },
};

export const Warn: Story = {
  args: {
    kind: "warn",
    children: "Integer division truncates toward zero. 7 / 2 is 3, not 3.5.",
  },
};

export const Tip: Story = {
  args: {
    kind: "tip",
    children: "Use double literals (7.0 / 2) to force floating-point division.",
  },
};
