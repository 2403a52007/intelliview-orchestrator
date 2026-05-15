/**
 * Hook that auto-hydrates the API token from localStorage on mount.
 * Use once in a top-level component (e.g., the root layout).
 */
"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function useHydrateToken() {
  const { hydrate, hasHydrated } = useAppStore();
  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hydrate, hasHydrated]);
}
