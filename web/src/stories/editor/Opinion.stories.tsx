import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Opinion } from "@learnrobotics/editor/mdx";

const meta = {
  component: Opinion,
} satisfies Meta<typeof Opinion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children:
      "Static types catch the bugs you'd never find in review. People will disagree.",
  },
};
