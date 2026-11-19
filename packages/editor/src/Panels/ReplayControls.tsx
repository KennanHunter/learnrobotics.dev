import { createSignal, Show } from "solid-js";
import { AiOutlineCaretRight } from "solid-icons/ai/AiOutlineCaretRight";
import { AiOutlinePause } from "solid-icons/ai/AiOutlinePause";
import { AiOutlineSound } from "solid-icons/ai/AiOutlineSound";
import { AiOutlineMuted } from "solid-icons/ai/AiOutlineMuted";

/* Non-functional UI stubs for the replay system. Wire these to the
   recorder/player once the event stream lands. */
export function ReplayControls() {
  const [playing, setPlaying] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [volume, setVolume] = createSignal(80);
  const [volumeOpen, setVolumeOpen] = createSignal(false);

  return (
    <div
      class="flex min-w-0 items-center gap-3"
      data-testid="replay-controls"
      aria-label="Replay controls (stub)"
    >
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        class="flex h-7 w-7 items-center justify-center rounded border border-background-offset hover:bg-background-offset"
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
        step={1}
        value={progress()}
        onInput={(e) => setProgress(Number(e.currentTarget.value))}
        class="h-1 w-48 cursor-pointer accent-primary"
        aria-label="Seek replay"
      />
      <span class="w-10 shrink-0 text-right font-mono text-[10px] text-foreground-muted tabular-nums">
        {progress().toString().padStart(2, "0")}%
      </span>
      <div
        class="relative flex items-center"
        onMouseEnter={() => setVolumeOpen(true)}
        onMouseLeave={() => setVolumeOpen(false)}
      >
        <button
          type="button"
          onClick={() => setVolume((v) => (v === 0 ? 80 : 0))}
          class="flex h-7 w-7 items-center justify-center rounded border border-background-offset hover:bg-background-offset"
          aria-label={volume() === 0 ? "Unmute" : "Mute"}
          title={volume() === 0 ? "Unmute" : "Mute"}
        >
          <Show
            when={volume() > 0}
            fallback={<AiOutlineMuted class="h-3.5 w-3.5" />}
          >
            <AiOutlineSound class="h-3.5 w-3.5" />
          </Show>
        </button>
        <Show when={volumeOpen()}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume()}
            onInput={(e) => setVolume(Number(e.currentTarget.value))}
            class="ml-2 h-1 w-20 cursor-pointer accent-primary"
            aria-label="Volume"
          />
        </Show>
      </div>
    </div>
  );
}
