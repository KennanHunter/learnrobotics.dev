import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ThemeToggle } from "./ThemeToggle";
import { signedInSession, withSession } from "../../../.storybook/decorators";

const meta = {
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightMode: Story = {
  decorators: [withSession({ ...signedInSession!, theme: "light" })],
};

export const DarkMode: Story = {
  decorators: [withSession({ ...signedInSession!, theme: "dark" })],
};
