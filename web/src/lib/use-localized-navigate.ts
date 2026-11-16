import { useNavigate } from "@tanstack/solid-router";

// The client router is mounted with basepath `/${getLocale()}` (see
// src/router.tsx), so `to: "/settings"` already resolves to the locale-
// prefixed URL. This hook is a thin ergonomic wrapper that accepts a plain
// path string and does a client-side navigation.
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  return (to: string) => navigate({ to });
}
