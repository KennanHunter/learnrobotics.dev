import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createJSXDecorator } from "storybook-solidjs-vite";
import { MonacoEditor } from "./Monaco";

const meta = {
  component: MonacoEditor,
  tags: ["!autodocs"],
  decorators: [
    createJSXDecorator((Story) => (
      <div style={{ width: "640px", height: "360px" }}>
        <Story />
      </div>
    )),
  ],
} satisfies Meta<typeof MonacoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
    }
}
`;

export const Java: Story = {
  args: {
    language: "java",
    value: SAMPLE,
  },
};

export const TypeScript: Story = {
  args: {
    language: "typescript",
    value: `export function greet(name: string): string {\n  return \`hello, \${name}\`;\n}\n`,
  },
};
