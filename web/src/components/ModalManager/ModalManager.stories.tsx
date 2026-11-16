import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ModalProvider, useModal } from "./ModalManager";

const meta = {
  component: ModalProvider,
} satisfies Meta<typeof ModalProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function DemoContent() {
  return (
    <div class="p-6">
      <h2 class="mb-2 text-xl font-semibold">Hello from the modal</h2>
      <p class="text-sm text-primary/60">
        Click the backdrop or press Escape to close.
      </p>
    </div>
  );
}

function Trigger() {
  const modal = useModal();
  return (
    <button
      type="button"
      class="rounded bg-primary px-3 py-1 text-sm text-background hover:opacity-80"
      onClick={() => modal.open(DemoContent)}
    >
      Open modal
    </button>
  );
}

export const Default: Story = {
  render: () => (
    <ModalProvider>
      <div class="p-6">
        <Trigger />
      </div>
    </ModalProvider>
  ),
};
