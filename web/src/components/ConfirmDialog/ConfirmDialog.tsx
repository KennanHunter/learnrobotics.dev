import type { JSX } from "solid-js";
import { useModal } from "~/components/ModalManager/ModalManager";

export type ConfirmOptions = {
  title: string;
  description?: JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red. Use for destructive actions. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Hook-style helper that returns a `confirm(options)` function. Opens the
 * app's modal with a simple title/description/confirm/cancel body; runs
 * `onConfirm` when the user clicks confirm and auto-closes after.
 */
export function useConfirm() {
  const modal = useModal();
  return (options: ConfirmOptions) => {
    modal.open(() => <ConfirmBody {...options} close={modal.close} />, {
      variant: "modal",
      size: "sm",
      anchor: "center",
    });
  };
}

function ConfirmBody(props: ConfirmOptions & { close: () => void }) {
  const run = async () => {
    try {
      await props.onConfirm();
    } finally {
      props.close();
    }
  };

  return (
    <div class="flex h-full flex-col gap-4 p-6">
      <div>
        <h2 class="text-base font-semibold tracking-tight">{props.title}</h2>
        {props.description && (
          <p class="mt-2 text-sm text-foreground-muted">{props.description}</p>
        )}
      </div>
      <div class="mt-auto flex justify-end gap-2">
        <button
          type="button"
          onClick={props.close}
          class="rounded border border-background-offset px-3 py-1 text-xs hover:bg-background-offset"
        >
          {props.cancelLabel ?? "Cancel"}
        </button>
        <button
          type="button"
          onClick={run}
          class={
            props.destructive
              ? "rounded border border-red/40 bg-red/10 px-3 py-1 text-xs text-red hover:bg-red/20"
              : "rounded border border-primary bg-primary px-3 py-1 text-xs text-background hover:bg-primary/90"
          }
        >
          {props.confirmLabel ?? "Confirm"}
        </button>
      </div>
    </div>
  );
}
