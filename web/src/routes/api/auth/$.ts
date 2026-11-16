import { createFileRoute } from "@tanstack/solid-router";
import { getAuth } from "~/server/auth";

const handler = ({ request }: { request: Request }) =>
  getAuth().handler(request);

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
