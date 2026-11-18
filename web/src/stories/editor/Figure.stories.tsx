import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Figure } from "@learnrobotics/editor/mdx";

const meta = {
  component: Figure,
} satisfies Meta<typeof Figure>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 300'>
      <rect width='800' height='300' fill='#e2e8f0'/>
      <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
        font-family='monospace' font-size='24' fill='#475569'>sample figure</text>
    </svg>`,
  );

export const WithCaption: Story = {
  args: {
    src: SAMPLE_SRC,
    caption: "A tank drive, viewed from above.",
  },
};

export const NoCaption: Story = {
  args: {
    src: SAMPLE_SRC,
    alt: "diagram",
  },
};
