// src/runtime/eventBus.ts
// Simple internal pub-sub event bus for the Studio Controller.
// Scrapbot, OBS, hotkeys, and local UI actions can all publish events here.
// The rundown engine and panels can subscribe to it.

import { useEffect } from "react";

export type StudioEvent = {
  type: string;          // e.g., "kick.chat.message", "debug.test"
  source: string;        // "scrapbot" | "obs" | "local" | "dashboard" | ...
  channel?: string;      // Kick channel slug or other routing key
  payload: any;          // Raw event data
};

type Listener = (event: StudioEvent) => void;

const listeners = new Set<Listener>();

/**
 * Push a new event into the internal bus.
 * Everyone who called subscribeEvents(fn) will receive it.
 */
export function publishEvent(event: StudioEvent) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (err) {
      console.error("[EventBus] Listener error:", err);
    }
  }
}

/**
 * Subscribe to events from the internal bus.
 * Returns an unsubscribe function.
 */
export function subscribeEvents(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * React hook: subscribe to a specific event type.
 * Automatically unsubscribes on unmount.
 */
export function useEventBus(type: string, handler: (event: StudioEvent) => void) {
  useEffect(() => {
    const unsub = subscribeEvents((event) => {
      if (event.type === type) handler(event);
    });
    return unsub;
  }, [type]);
}
