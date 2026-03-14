// src/hooks/useObsConnection.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  connectOBS,
  disconnectOBS,
  sendToOBS,
} from "../utils/obsClient";

const OBSConnectionContext = createContext(null);

/**
 * Provider that owns the OBS websocket lifecycle
 * and shares connection status + scene info.
 */
export function OBSConnectionProvider({ children }) {
  // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [status, setStatus] = useState("disconnected");
  const [error, setError] = useState(null);

  const [scenes, setScenes] = useState([]);
  const [programScene, setProgramScene] = useState(null);

  const loadScenes = useCallback(async () => {
    if (status !== "connected") return;

    try {
      const resp = await sendToOBS("GetSceneList");
      setScenes(resp.scenes || []);
      setProgramScene(resp.currentProgramSceneName || null);
    } catch (err) {
      console.error("[OBS] loadScenes failed:", err);
    }
  }, [status]);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") {
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      await connectOBS(); // actually opens the websocket
      setStatus("connected");

      // Best-effort initial scene load
      try {
        const resp = await sendToOBS("GetSceneList");
        setScenes(resp.scenes || []);
        setProgramScene(resp.currentProgramSceneName || null);
      } catch (err) {
        console.warn(
          "[OBS] connected but failed to fetch scene list:",
          err
        );
      }
    } catch (err) {
      console.error("[OBS] connect failed:", err);
      setError(err.message || "Failed to connect to OBS");
      setStatus("error");
    }
  }, [status]);

  const disconnect = useCallback(() => {
    try {
      disconnectOBS();
    } finally {
      setStatus("disconnected");
      setScenes([]);
      setProgramScene(null);
    }
  }, []);

  const setProgram = useCallback(
    async (sceneName) => {
      if (status !== "connected" || !sceneName) return;

      try {
        await sendToOBS("SetCurrentProgramScene", { sceneName });
        setProgramScene(sceneName);
      } catch (err) {
        console.error("[OBS] setProgram failed:", err);
      }
    },
    [status]
  );

  const value = {
    status,
    error,
    scenes,
    programScene,
    connect,
    disconnect,
    reloadScenes: loadScenes,
    setProgram,
  };

  // IMPORTANT: no JSX here – use createElement so .js stays valid
  return React.createElement(
    OBSConnectionContext.Provider,
    { value },
    children
  );
}

export function useObsConnection() {
  const ctx = useContext(OBSConnectionContext);
  if (!ctx) {
    throw new Error(
      "useObsConnection must be used inside <OBSConnectionProvider>"
    );
  }
  return ctx;
}
