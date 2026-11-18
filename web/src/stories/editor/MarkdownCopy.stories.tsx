import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { MarkdownCopy } from "@learnrobotics/editor";

const meta = {
  component: MarkdownCopy,
} satisfies Meta<typeof MarkdownCopy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    markdownUrl: "data:text/plain,Sample%20markdown%20body",
  },
};
