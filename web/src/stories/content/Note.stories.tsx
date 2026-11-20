import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Note } from "@learnrobotics/content/components/Note";

const meta = {
  component: Note,
  argTypes: {
    variant: {
      control: "select",
      options: ["normal", "info", "important", "warning"],
    },
    title: { control: "text" },
  },
} satisfies Meta<typeof Note>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    variant: "normal",
    children:
      "Plain note with no header or color accent — use for asides that don't need attention.",
  },
};

export const Info: Story = {
  args: {
    variant: "info",
    children:
      "Fenced code blocks default to the language of the current lesson. Override with ```java / ```markdown as needed.",
  },
};

export const Important: Story = {
  args: {
    variant: "important",
    children:
      "Autosave only fires once you start editing. New projects get their first row created on the first keystroke.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children:
      "Deleting a project is permanent. There is no undo and no soft-delete; the row is removed from D1.",
  },
};

export const CustomTitle: Story = {
  args: {
    variant: "info",
    title: "FRC-specific",
    children:
      "On WPILib, the main class is `Robot` and the entry point is `robotInit()`.",
  },
};

export const HeaderHidden: Story = {
  args: {
    variant: "warning",
    title: "",
    children:
      'Passing title="" hides the header and icon while keeping the color accent.',
  },
};
