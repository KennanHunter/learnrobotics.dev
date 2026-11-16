import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { LogoSquare } from "./LogoSquare";

const meta = {
  component: LogoSquare,
} satisfies Meta<typeof LogoSquare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { class: "w-64" },
};

export const Opaque: Story = {
  args: { class: "w-64", opaque: true },
};
