import type { ReplayEvent } from "./schema";
import { applyEventToSink, PlainFileSink } from "./snapshots";

/**
 * Trim an event stream to `[tStart, tEnd]`. Events outside the range are
 * dropped. Events in the pre-trim window are replayed against the starter
 * files to compute the mid-state, which becomes the new `init`. All kept
 * event timestamps are rebased so the output starts at t=0.
 */
export function cropEvents(
  events: readonly ReplayEvent[],
  starterFiles: Record<string, string>,
  starterActiveFile: string,
  tStart: number,
  tEnd: number,
): ReplayEvent[] {
  if (events.length === 0) return [];
  const first = events[0];
  if (first.type !== "init") {
    throw new Error("cropEvents: first event must be init");
  }
  if (tStart < 0) throw new Error("cropEvents: tStart must be >= 0");
  if (tEnd < tStart) throw new Error("cropEvents: tEnd must be >= tStart");

  // Replay [0, tStart) against starter to get mid-state.
  const sink = new PlainFileSink();
  sink.replaceAllFiles(starterFiles, starterActiveFile);
  // Apply init first (the recording's init may differ from starter — it wins).
  applyEventToSink(sink, first);
  for (let i = 1; i < events.length; i++) {
    const e = events[i];
    if (e.t >= tStart) break;
    applyEventToSink(sink, e);
  }
  const newInit: ReplayEvent = {
    t: 0,
    type: "init",
    files: sink.snapshotFiles(),
    activeFile: sink.getActiveFile(),
  };

  const out: ReplayEvent[] = [newInit];
  for (let i = 1; i < events.length; i++) {
    const e = events[i];
    if (e.t < tStart) continue;
    if (e.t > tEnd) break;
    // The first event is already consumed as `newInit`, so `e` here is
    // never an InitEvent. Rebase via a narrowed cast to satisfy the
    // discriminated union (InitEvent requires t: 0).
    out.push({ ...e, t: e.t - tStart } as Exclude<ReplayEvent, { type: "init" }>);
  }
  return out;
}

export function insertHighlight(
  events: readonly ReplayEvent[],
  t: number,
  target: string,
  durationMs?: number,
): ReplayEvent[] {
  return insertSorted(events, {
    t,
    type: "highlight",
    target,
    ...(durationMs !== undefined ? { durationMs } : {}),
  });
}

export function insertAutoPause(
  events: readonly ReplayEvent[],
  t: number,
  resumeOn: "edit" | "button" = "button",
): ReplayEvent[] {
  return insertSorted(events, { t, type: "auto-pause", resumeOn });
}

export function insertHighlightClear(
  events: readonly ReplayEvent[],
  t: number,
  target?: string,
): ReplayEvent[] {
  return insertSorted(events, {
    t,
    type: "highlight-clear",
    ...(target !== undefined ? { target } : {}),
  });
}

function insertSorted(
  events: readonly ReplayEvent[],
  event: ReplayEvent,
): ReplayEvent[] {
  // Insert after the last event with `t <= event.t`, preserving stable order.
  let i = 0;
  while (i < events.length && events[i].t <= event.t) i++;
  return [...events.slice(0, i), event, ...events.slice(i)];
}
