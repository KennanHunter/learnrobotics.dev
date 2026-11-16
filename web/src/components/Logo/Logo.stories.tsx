import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Logo } from "./Logo";

const meta = {
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { class: "w-96" },
};

export const Opaque: Story = {
  args: { class: "w-96", opaque: true },
};
