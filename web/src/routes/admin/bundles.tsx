import { createFileRoute } from "@tanstack/solid-router";
import { Bundles } from "~/components/admin/Bundles/Bundles";

export const Route = createFileRoute("/admin/bundles")({
  component: Bundles,
});
