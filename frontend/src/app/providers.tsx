"use client";
import { SWRConfig } from "swr";
import { swrFetcher } from "@/lib/fetcher";
import { useHydrateToken } from "@/hooks/useHydrateToken";
import { useThemeStore, hydrateTheme } from "@/lib/theme";
import { useEffect, useState, useCallback } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/Toaster";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Sidebar } from "@/components/Sidebar";
import { useUIStore } from "@/lib/ui-store";
import { endpoints, api } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useHydrateToken();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateTheme();
    setHydrated(true);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebar);

  useKeyboardNav(() => setHelpOpen(true));

  // Global Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  const handleAction = useCallback(async (action: string) => {
    if (action === "start") {
      router.push("/sessions?action=start");
      return;
    }
    if (action === "refresh") {
      toast.info("Refreshing all data…");
      window.location.reload();
      return;
    }
    if (action === "detect") {
      try {
        const r = await endpoints.detectFailures();
        toast.success(
          "Failure detection complete",
          `${r.failed_sessions_detected} failed · ${r.unhealthy_workers_detected} unhealthy · ${r.stuck_sessions_detected} stuck`
        );
      } catch (e) {
        toast.error("Detection failed", e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (action === "clear-cache") {
      try {
        await api.delete("/clear-cache");
        toast.success("Cache cleared");
      } catch (e) {
        toast.error("Failed to clear cache", e instanceof Error ? e.message : String(e));
      }
      return;
    }
  }, [router]);

  if (!hydrated) {
    return <div className="min-h-screen bg-bg" />;
  }

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        refreshInterval: 5000,
        shouldRetryOnError: false,
        onError: (err) => {
          // eslint-disable-next-line no-console
          console.warn("[SWR]", err.message);
        },
      }}
    >
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onAction={handleAction} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toaster />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
      </MobileSidebar>
    </SWRConfig>
  );
}
