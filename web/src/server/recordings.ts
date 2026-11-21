import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { requireAdmin } from "@learnrobotics/db/data";
import { getEnv } from "./env";
import { presignPublicDownload } from "./r2";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "recordings" });

const RecordingIdSchema = v.pipe(
  v.string(),
  v.regex(/^[a-f0-9]{64}$/, "recording id must be a sha256 hex string"),
);

const RecordingAssetSchema = v.picklist(["events", "audio", "metadata"]);

type RecordingAsset = v.InferOutput<typeof RecordingAssetSchema>;

// Keys are stored relative to the bucket root (not the ARTIFACT_KINDS
// prefix — that only applies to the presigning helpers). We write
// directly through the R2 binding, so we build the full key here.
function keyFor(id: string, asset: RecordingAsset): string {
  const filename = {
    events: "events.jsonl",
    audio: "audio.webm",
    metadata: "metadata.json",
  }[asset];
  return `recordings/${id}/${filename}`;
}

function contentTypeFor(asset: RecordingAsset): string {
  switch (asset) {
    case "events":
      return "application/jsonl";
    case "audio":
      return "audio/webm";
    case "metadata":
      return "application/json";
  }
}

// Admin uploads are proxied through the Worker so we never need to configure
// R2 bucket CORS for browser PUTs. The payload is base64-encoded in the
// request body (small overhead; recordings are a few MB at most).
const UploadSchema = v.object({
  id: RecordingIdSchema,
  asset: RecordingAssetSchema,
  base64: v.pipe(v.string(), v.maxLength(200 * 1024 * 1024)),
});

export const uploadRecordingAsset = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(UploadSchema, data))
  .handler(async ({ data }) => {
    await requireAdmin();
    const env = getEnv();
    const bytes = base64ToBytes(data.base64);
    await env.R2.put(keyFor(data.id, data.asset), bytes, {
      httpMetadata: { contentType: contentTypeFor(data.asset) },
    });
    log.info(
      { id: data.id, asset: data.asset, bytes: bytes.byteLength },
      "uploadRecordingAsset",
    );
    return { ok: true as const };
  });

// Read-side proxy: pulls events.jsonl through the Worker (so the browser
// isn't blocked by R2 CORS on the JSON read), and hands back a signed URL
// for the audio (<audio src=…> doesn't require CORS).
const GetRecordingSchema = v.object({ id: RecordingIdSchema });

export type GetRecordingResult = {
  eventsText: string;
  audioUrl: string;
  metadataText: string | null;
};

export const getRecording = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(GetRecordingSchema, data))
  .handler(async ({ data }): Promise<GetRecordingResult> => {
    const env = getEnv();
    const [eventsObj, metadataObj, audioUrl] = await Promise.all([
      env.R2.get(keyFor(data.id, "events")),
      env.R2.get(keyFor(data.id, "metadata")),
      presignPublicDownload("lesson-recording", `${data.id}/audio.webm`),
    ]);
    if (!eventsObj) {
      throw new Error(`recording ${data.id} missing events.jsonl`);
    }
    return {
      eventsText: await eventsObj.text(),
      metadataText: (await metadataObj?.text()) ?? null,
      audioUrl,
    };
  });

function base64ToBytes(b64: string): Uint8Array {
  // atob is available in the Workers runtime.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
