import {
  KNOWN_EVENT_TYPES,
  type ReplayEvent,
  type ReplayEventType,
} from "./schema";

export function encodeEvents(events: readonly ReplayEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n");
}

export function decodeEvents(text: string): ReplayEvent[] {
  const lines = text.split("\n").filter((l) => l.length > 0);
  const out: ReplayEvent[] = [];
  for (const line of lines) {
    const parsed: unknown = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      throw new Error(`replay-event: missing type field in line: ${line}`);
    }
    const type = (parsed as { type: unknown }).type;
    if (
      typeof type !== "string" ||
      !KNOWN_EVENT_TYPES.has(type as ReplayEventType)
    ) {
      throw new Error(`replay-event: unknown type ${String(type)}`);
    }
    out.push(parsed as ReplayEvent);
  }
  return out;
}
