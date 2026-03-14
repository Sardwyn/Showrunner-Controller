// src/runtime/useRundownEventBridge.ts
import { useEffect, useRef } from "react";
import {
  subscribeEvents as eventSubscribe,
  publishEvent,
  StudioEvent,
} from "./eventBus";
import { useRundownEngineContext } from "../rundown/runtime/RundownEngineProvider";

export function useRundownEventBridge() {
  const engine = useRundownEngineContext();
  const esRef = useRef<EventSource | null>(null);

  //
  // 1) Bridge Scrapbot events from the internal bus into the Rundown engine
  //
  useEffect(() => {
    const unsubscribe = eventSubscribe((event) => {
      if (event.source !== "scrapbot") return;

      engine.handleExternalEvent({
        type: event.type,
        source: "scrapbot",
        payload: event.payload,
        receivedAt: Date.now(),
      });
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [engine]);

  //
  // 2) Bridge Dashboard SSE → internal eventBus
  //
  useEffect(() => {
    // Decide which URL to hit:
    // - In dev (localhost:5174) hit the real dashboard
    // - In prod (scraplet.store) hit same-origin /dashboard/...
    let sseUrl: string;
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1") {
      sseUrl = "https://scraplet.store/dashboard/api/events/stream";
    } else {
      sseUrl = "/dashboard/api/events/stream";
    }

    // Close any prior stream
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      }
    }

    const es = new EventSource(sseUrl, {
      withCredentials: true,
    } as any);

    esRef.current = es;

    es.onmessage = (msg: MessageEvent) => {
      try {
        const raw = JSON.parse(msg.data) as any;

        const evt: StudioEvent = {
          type: raw.type || "unknown",
          source: raw.source || "dashboard",
          channel: raw.channel,
          // Make sure Debug panel sees something meaningful
          payload: raw.payload ?? raw,
        };

        publishEvent(evt);
      } catch (err) {
        console.warn("[Studio] SSE parse error:", err, msg.data);
      }
    };

    es.onerror = (err) => {
      console.warn("[Studio] SSE connection lost:", err);
      // SSE will retry automatically; we just log.
    };

    return () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          // ignore
        }
        esRef.current = null;
      }
    };
  }, []);
}
