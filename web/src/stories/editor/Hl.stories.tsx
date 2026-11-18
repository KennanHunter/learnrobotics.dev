import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Hl } from "@learnrobotics/editor/mdx";

const meta = {
  component: Hl,
} satisfies Meta<typeof Hl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hid: "tip-calculator-total",
    children: "the final total",
  },
};
