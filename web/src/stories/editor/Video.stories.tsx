import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Video } from "@learnrobotics/editor/mdx";

const meta = {
  component: Video,
} satisfies Meta<typeof Video>;

export default meta;
type Story = StoryObj<typeof meta>;

// Public sample asset provided by Mozilla. Swap to a repo-hosted asset if
// external fetches become a problem in CI.
export const Default: Story = {
  args: {
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
};
