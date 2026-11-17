import { createFileRoute } from "@tanstack/solid-router";
import { presignPublicDownload } from "~/server/r2";

const VALID_KINDS = new Set(["jdk", "library"]);

const handler = async ({ params }: { params: { kind: string; pin: string } }) => {
  if (!VALID_KINDS.has(params.kind)) {
    return new Response("unknown bundle kind", { status: 404 });
  }
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(params.pin)) {
    return new Response("invalid pin", { status: 400 });
  }
  const key = `${params.kind}/${params.pin}/bundle.tar.gz`;
  const url = await presignPublicDownload("runtime-bundle", key);
  return Response.redirect(url, 302);
};

export const Route = createFileRoute("/api/bundles/$kind/$pin")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
