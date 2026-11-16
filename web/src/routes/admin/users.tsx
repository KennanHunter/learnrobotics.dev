import { createFileRoute } from "@tanstack/solid-router";
import { Users } from "~/components/admin/Users/Users";

export const Route = createFileRoute("/admin/users")({
  component: Users,
});
