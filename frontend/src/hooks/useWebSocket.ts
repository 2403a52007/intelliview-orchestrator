"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface UseWebSocketOptions {
  path: string;
  onMessage?: (data: unknown) => void;
  enabled?: boolean;
}

/**
 * Minimal WebSocket hook. Reconnects with exponential backoff.
 * Returns the most recent message and a connected flag.
 */
export function useWebSocket({ path, onMessage, enabled = true }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(api.wsUrl(path));
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          retryRef.current = 0;
        };
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            setLastMessage(data);
            onMessage?.(data);
          } catch {
            // ignore non-JSON frames (e.g., pongs)
          }
        };
        ws.onclose = () => {
          setConnected(false);
          if (cancelled) return;
          const backoff = Math.min(15000, 500 * 2 ** retryRef.current++);
          timer = setTimeout(connect, backoff);
        };
        ws.onerror = () => ws.close();
      } catch {
        const backoff = Math.min(15000, 500 * 2 ** retryRef.current++);
        timer = setTimeout(connect, backoff);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [path, onMessage, enabled]);

  return { connected, lastMessage };
}
