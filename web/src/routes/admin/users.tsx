import { createFileRoute } from "@tanstack/solid-router";
import * as v from "valibot";
import { Users } from "~/components/admin/Users/Users";

const SearchSchema = v.object({
  q: v.optional(v.string()),
});

export const Route = createFileRoute("/admin/users")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Users,
});
