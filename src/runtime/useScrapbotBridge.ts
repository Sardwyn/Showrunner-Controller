// src/runtime/useScrapbotBridge.ts
import { useEffect } from "react";
import { publishEvent } from "./eventBus";
import { useStudioContext } from "./StudioContext";

export function useScrapbotBridge() {
  const { loading, ctx } = useStudioContext();

  useEffect(() => {
    if (loading) return;
    if (!ctx?.kick?.channel) return;
    if (!ctx.scrapbot?.wsUrl) return;

    const slug =
      ctx.kick.channel.slug ||
      ctx.kick.channel.channel_slug ||
      ctx.kick.channel.username ||
      ctx.kick.channel.id;

    const ws = new WebSocket(ctx.scrapbot.wsUrl);

    ws.onopen = () => {
      console.log("[ScrapbotBridge] WS connected");
      // You might later send an auth/join message here
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);

        publishEvent({
          type: data.type || "scrapbot.raw",
          source: "scrapbot",
          channel: slug,
          payload: data,
        });
      } catch (err) {
        console.error("[ScrapbotBridge] JSON error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[ScrapbotBridge] WS error", err);
    };

    ws.onclose = () => {
      console.log("[ScrapbotBridge] WS closed");
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [loading, ctx]);
}
