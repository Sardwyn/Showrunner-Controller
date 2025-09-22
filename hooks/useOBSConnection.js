// src/hooks/useOBSConnection.js
import { useEffect, useState } from "react";
import { isOBSConnected, connectOBS } from "../utils/obsClient";

export function useOBSConnection() {
  const [connected, setConnected] = useState(isOBSConnected());

  useEffect(() => {
    async function ensureConnection() {
      if (!isOBSConnected()) {
        try {
          await connectOBS();
          setConnected(true);
        } catch (err) {
          console.error("❌ Failed to connect to OBS:", err.message);
          setConnected(false);
        }
      } else {
        setConnected(true);
      }
    }

    ensureConnection();
  }, []);

  return connected;
}
