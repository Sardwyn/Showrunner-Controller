// src/components/OBSScenePanel.jsx
import React from "react";
import { useObsConnection } from "../hooks/useObsConnection";
import StudioButton from "./StudioButton";

export default function OBSScenePanel() {
  const {
    status,
    error,
    scenes,
    programScene,
    connect,
    setProgram,
  } = useObsConnection();

  const isConnected = status === "connected";

  return (
    <div className="pc-panel-body obs-scenes-panel">
      <div className="controller-panel-header flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.18em] uppercase">
          OBS Scenes
        </span>

        <div className="flex items-center gap-2">
          <span className={`obs-status-dot obs-status-${status}`} />
          <span className="text-[0.7rem] uppercase tracking-[0.15em] text-slate-400">
            {status === "connected"
              ? "Connected"
              : status === "connecting"
              ? "Connecting…"
              : status === "error"
              ? "Error"
              : status === "disconnected"
              ? "Disconnected"
              : "Not Connected"}
          </span>

          {status !== "connected" && (
            <button
              type="button"
              className="pro-button pro-button-xs"
              onClick={connect}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {isConnected && scenes.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {scenes.map((scene) => (
            <StudioButton
              key={scene.sceneName}
              label={scene.sceneName}
              onClick={() => setProgram(scene.sceneName)}
              isActive={scene.sceneName === programScene}
            />
          ))}
        </div>
      ) : !error ? (
        <p className="mt-3 text-xs text-slate-400">
          {status === "connecting"
            ? "Requesting scene list from OBS…"
            : "Click Connect to control OBS scenes."}
        </p>
      ) : null}
    </div>
  );
}
