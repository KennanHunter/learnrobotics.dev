import { createFileRoute } from "@tanstack/solid-router";
import { Stats } from "~/components/admin/Stats/Stats";

export const Route = createFileRoute("/admin/stats")({
  component: Stats,
});
