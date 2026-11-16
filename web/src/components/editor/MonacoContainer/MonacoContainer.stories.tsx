import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { MonacoContainer } from "./MonacoContainer";

const meta = {
  component: MonacoContainer,
} satisfies Meta<typeof MonacoContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    width: "480px",
    height: "240px",
    class: "border border-background-offset",
    children: (
      <div class="flex h-full items-center justify-center text-sm text-foreground-muted">
        Container content
      </div>
    ),
  },
};
