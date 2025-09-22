import OBSWebSocket from "obs-websocket-js";
import { useEffect, useState } from "react";

const obs = new OBSWebSocket();
let isConnected = false;
let connectionPromise = null;

// ✅ React hook to track connection status
export function useOBSConnection() {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    async function connect() {
      try {
        await connectOBS();
        setStatus("connected");
      } catch (err) {
        setStatus("error");
      }
    }

    connect();
  }, []);

  return status;
}

// ✅ One-time connect logic
export async function connectOBS() {
  if (isConnected) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      await obs.connect("ws://192.168.0.74:4455", "N4qb2ALhe4vkco0N");
      isConnected = true;
      console.log("✅ Connected to OBS WebSocket");
      resolve();
    } catch (error) {
      console.error("❌ Failed to connect to OBS WebSocket:", error.message || error);
      reject(error);
    }
  });

  return connectionPromise;
}

// ✅ Utility to gate code until connected
export async function onOBSConnected() {
  return connectOBS();
}

// ✅ Generic wrapper for OBS requests
export async function sendToOBS(requestType, requestData = {}) {
  if (!isConnected) {
    throw new Error("OBS not connected yet.");
  }

  try {
    const response = await obs.call(requestType, requestData);
    return response;
  } catch (err) {
    console.error(`❌ OBS call failed (${requestType}):`, err.message || err);
    throw err;
  }
}

// ✅ Expose status check for conditional logic
export function isOBSConnected() {
  return isConnected;
}
