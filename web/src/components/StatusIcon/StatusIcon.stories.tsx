import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { StatusIcon, statusLabel } from "./StatusIcon";

const meta = {
  component: StatusIcon,
} satisfies Meta<typeof StatusIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Todo: Story = { args: { status: "todo" } };
export const InProgress: Story = { args: { status: "in-progress" } };
export const Done: Story = { args: { status: "done" } };
export const PlacementPassed: Story = { args: { status: "placement-passed" } };

export const AllStates: Story = {
  render: () => (
    <ul class="flex flex-col gap-2 text-sm">
      {(
        ["todo", "in-progress", "done", "placement-passed"] as const
      ).map((status) => (
        <li class="flex items-center gap-2">
          <StatusIcon status={status} />
          <span>{statusLabel[status]}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Large: Story = {
  args: { status: "done", class: "text-3xl" },
};
