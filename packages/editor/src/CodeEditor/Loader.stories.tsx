import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createJSXDecorator } from "storybook-solidjs-vite";
import { Loader } from "./Loader";

const meta = {
  component: Loader,
  decorators: [
    createJSXDecorator((Story) => (
      <div class="relative h-40 w-80 border border-background-offset">
        <Story />
      </div>
    )),
  ],
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Loading…" },
};
