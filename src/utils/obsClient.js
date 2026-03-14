// src/utils/obsClient.js
import OBSWebSocket from "obs-websocket-js";

const obs = new OBSWebSocket();
let isIdentified = false;

/**
 * Connect to OBS via websocket.
 * Uses saved URL/password from localStorage if present.
 */
export async function connectOBS() {
  if (isIdentified) {
    // already connected
    return;
  }

  const url =
    window.localStorage.getItem("scraplet_obs_url") ||
    "ws://127.0.0.1:4455";
  const password =
    window.localStorage.getItem("scraplet_obs_password") || "";

  try {
    console.log("[OBS] Connecting to", url);
    await obs.connect(url, password);
    isIdentified = true;
    console.log("[OBS] Connected");
  } catch (err) {
    isIdentified = false;
    console.error("[OBS] connect error:", err);
    throw err;
  }
}

/**
 * Disconnect (used by the provider / status bar if needed).
 */
export function disconnectOBS() {
  try {
    if (obs._connected) {
      console.log("[OBS] Disconnecting…");
      obs.disconnect();
    }
  } catch (err) {
    console.warn("[OBS] disconnect error:", err);
  } finally {
    isIdentified = false;
  }
}

/**
 * Simple flag the UI can use.
 */
export function isOBSConnected() {
  return !!isIdentified;
}

/**
 * Wrapper for OBS requests.
 * Throws if not connected.
 */
export async function sendToOBS(requestType, args = {}) {
  if (!isIdentified) {
    throw new Error("OBS not connected yet.");
  }

  return obs.call(requestType, args);
}

/**
 * Optional: subscribe to raw OBS events if you want later.
 */
export function onOBSEvent(eventName, handler) {
  obs.on(eventName, handler);
}
