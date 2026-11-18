import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { LoremIpsum } from "@learnrobotics/content/components/LoremIpsum";

const meta = {
  component: LoremIpsum,
} satisfies Meta<typeof LoremIpsum>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OneParagraph: Story = {
  args: { paragraphs: 1 },
};

export const ThreeParagraphs: Story = {
  args: { paragraphs: 3 },
};
