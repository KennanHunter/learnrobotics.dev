import { Show } from "solid-js";
import { AiOutlineCaretRight } from "solid-icons/ai/AiOutlineCaretRight";
import { AiOutlinePause } from "solid-icons/ai/AiOutlinePause";
import { AiOutlineSound } from "solid-icons/ai/AiOutlineSound";
import { AiOutlineMuted } from "solid-icons/ai/AiOutlineMuted";
import { HoverCard } from "@learnrobotics/content/components/HoverCard";
import type { ReplayController } from "../replay/useReplayHost";

export type ReplayControlsProps = {
  /** When provided, binds play/scrubber/volume to a live replay host.
   * When omitted, the controls remain a disabled visual stub (previous
   * behavior) so callers that render ReplayControls unconditionally still
   * work before a recording is loaded. */
  controller?: ReplayController;
};

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

export function ReplayControls(props: ReplayControlsProps) {
  const enabled = () => Boolean(props.controller);

  const playing = () => props.controller?.playing() ?? false;
  const currentMs = () => props.controller?.currentMs() ?? 0;
  const durationMs = () => props.controller?.durationMs() ?? 0;
  const volumePct = () => Math.round((props.controller?.volume() ?? 0.8) * 100);
  const progressPct = () => {
    const d = durationMs();
    if (d <= 0) return 0;
    return Math.min(100, Math.max(0, (currentMs() / d) * 100));
  };

  const onTogglePlay = async () => {
    const c = props.controller;
    if (!c) return;
    if (c.playing()) c.pause();
    else await c.play();
  };

  const onSeek = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const c = props.controller;
    if (!c) return;
    const pct = Number(e.currentTarget.value) / 100;
    c.seek(pct * durationMs());
  };

  const onVolume = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const c = props.controller;
    if (!c) return;
    c.setVolume(Number(e.currentTarget.value) / 100);
  };

  const onToggleMute = () => {
    const c = props.controller;
    if (!c) return;
    c.setVolume(volumePct() === 0 ? 0.8 : 0);
  };

  return (
    <div
      class="flex min-w-0 items-center gap-3"
      data-testid="replay-controls"
      aria-label="Replay controls"
    >
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={!enabled()}
        class="flex h-7 w-7 items-center justify-center rounded border border-background-offset hover:bg-background-offset disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={playing() ? "Pause replay" : "Play replay"}
        title={playing() ? "Pause replay" : "Play replay"}
      >
        <Show
          when={playing()}
          fallback={<AiOutlineCaretRight class="h-3.5 w-3.5" />}
        >
          <AiOutlinePause class="h-3.5 w-3.5" />
        </Show>
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progressPct()}
        onInput={onSeek}
        disabled={!enabled()}
        class="h-1 w-48 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Seek replay"
      />
      <span class="w-20 shrink-0 text-right font-mono text-[10px] text-foreground-muted tabular-nums">
        {formatMs(currentMs())} / {formatMs(durationMs())}
      </span>
      <Show when={props.controller?.autoPaused()}>
        <button
          type="button"
          class="rounded border border-primary px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          onClick={() => {
            props.controller?.resume();
            props.controller?.play();
          }}
        >
          Continue
        </button>
      </Show>
      <HoverCard
        placement="top"
        interactive
        content={() => (
          <div class="flex items-center gap-2" data-testid="volume-popover">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePct()}
              onInput={onVolume}
              class="h-1 w-28 cursor-pointer accent-primary"
              aria-label="Volume"
            />
            <span class="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums">
              {volumePct()}%
            </span>
          </div>
        )}
      >
        {(ref) => (
          <button
            ref={ref}
            type="button"
            onClick={onToggleMute}
            disabled={!enabled()}
            class="flex h-7 w-7 items-center justify-center rounded border border-background-offset hover:bg-background-offset disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={volumePct() === 0 ? "Unmute" : "Mute"}
            title={volumePct() === 0 ? "Unmute" : "Mute"}
          >
            <Show
              when={volumePct() > 0}
              fallback={<AiOutlineMuted class="h-3.5 w-3.5" />}
            >
              <AiOutlineSound class="h-3.5 w-3.5" />
            </Show>
          </button>
        )}
      </HoverCard>
    </div>
  );
}
