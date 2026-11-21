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

export type BundleMetadata = Record<string, unknown>;

export type BundleInput = {
  events: readonly ReplayEvent[];
  metadata: BundleMetadata;
  audio?: Uint8Array | ArrayBuffer | null;
};

export type Bundle = {
  eventsText: string;
  metadataText: string;
  audioBytes: Uint8Array | null;
};

export function encodeBundle(input: BundleInput): Bundle {
  return {
    eventsText: encodeEvents(input.events),
    metadataText: canonicalJson(input.metadata),
    audioBytes: toBytes(input.audio ?? null),
  };
}

/** sha256-hex of the canonical bundle. Stable → same inputs produce the
 * same id, so uploads to R2 are idempotent. */
export async function hashBundle(bundle: Bundle): Promise<string> {
  const te = new TextEncoder();
  const meta = te.encode(bundle.metadataText);
  const events = te.encode(bundle.eventsText);
  const audio = bundle.audioBytes ?? new Uint8Array(0);
  const header = te.encode(
    `bundle:v1\nmeta:${meta.length}\nevents:${events.length}\naudio:${audio.length}\n`,
  );
  const combined = new Uint8Array(
    header.length + meta.length + events.length + audio.length,
  );
  combined.set(header, 0);
  combined.set(meta, header.length);
  combined.set(events, header.length + meta.length);
  combined.set(audio, header.length + meta.length + events.length);
  const subtle = resolveSubtleCrypto();
  const digest = await subtle.digest("SHA-256", combined);
  return bytesToHex(new Uint8Array(digest));
}

function toBytes(
  v: Uint8Array | ArrayBuffer | null | undefined,
): Uint8Array | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return v;
  return new Uint8Array(v);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortDeep(v);
    return out;
  }
  return value;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function resolveSubtleCrypto(): SubtleCrypto {
  const g = globalThis as { crypto?: { subtle?: SubtleCrypto } };
  if (g.crypto?.subtle) return g.crypto.subtle;
  throw new Error("SubtleCrypto unavailable in this environment");
}
