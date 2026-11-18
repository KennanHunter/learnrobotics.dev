import type { ReplayEvent } from "./schema";

export type Disposer = () => void;
export type EventSubscriber = (event: ReplayEvent) => void;

function traceEnabledByDefault(): boolean {
  if (typeof import.meta !== "undefined") {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (env?.DEV) return true;
  }
  if (typeof localStorage !== "undefined") {
    try {
      if (localStorage.getItem("events:trace") === "1") return true;
    } catch {
      // storage may throw in sandboxed contexts; ignore
    }
  }
  return false;
}

function formatTrace(event: ReplayEvent): string {
  const head = `[event t=${event.t} type=${event.type}]`;
  switch (event.type) {
    case "edit": {
      let added = 0;
      let removed = 0;
      for (const c of event.changes) {
        added += c.text.length;
        const r = c.range;
        if (
          r.startLineNumber !== r.endLineNumber ||
          r.startColumn !== r.endColumn
        ) {
          removed += 1; // we don't have original length; count ranges instead
        }
      }
      return `${head} file=${event.file} changes=${event.changes.length} (+${added} -${removed})`;
    }
    case "cursor":
      return `${head} file=${event.file} L${event.line}:C${event.column}`;
    case "selection":
      return `${head} file=${event.file} ranges=${event.ranges.length}`;
    case "highlight":
      return `${head} target=${event.target} duration=${event.durationMs ?? 2500}`;
    case "auto-pause":
      return `${head} resumeOn=${event.resumeOn ?? "button"}`;
    case "init":
      return `${head} files=${Object.keys(event.files).length} active=${event.activeFile}`;
    case "active-file":
    case "file-create":
    case "file-delete":
      return `${head} file=${(event as { file: string }).file}`;
    case "file-rename":
      return `${head} ${event.from} -> ${event.to}`;
    case "marker":
      return `${head} label=${event.label}`;
    default:
      return head;
  }
}

export class EventDispatcher {
  private events: ReplayEvent[] = [];
  private subscribers = new Set<EventSubscriber>();
  private paused = false;
  private traceOverride: boolean | null = null;

  emit(event: ReplayEvent): void {
    if (this.paused) return;
    this.events.push(event);
    if (this.shouldTrace()) {
      // eslint-disable-next-line no-console
      console.log(formatTrace(event));
    }
    for (const sub of this.subscribers) {
      sub(event);
    }
  }

  subscribe(fn: EventSubscriber): Disposer {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  snapshot(): readonly ReplayEvent[] {
    return this.events.slice();
  }

  clear(): void {
    this.events = [];
  }

  setTrace(on: boolean): void {
    this.traceOverride = on;
  }

  private shouldTrace(): boolean {
    if (this.traceOverride !== null) return this.traceOverride;
    return traceEnabledByDefault();
  }
}
