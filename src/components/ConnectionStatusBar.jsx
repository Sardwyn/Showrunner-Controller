import React, { useState, useRef, useEffect } from "react";
import { sendToOBS } from "../utils/obsClient";
import StudioButton from "./StudioButton";
import { useObsConnection } from "../hooks/useObsConnection";

export default function ConnectionStatusBar({
  unrealConnected = false,
  ndiConnected = false,
}) {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const emergencyTimerRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // 🔌 OBS connection state from the hook
  const { status, connect, disconnect } = useObsConnection();
  const obsConnected = status === "connected";

  // (optional) auto-connect once when the bar mounts
  useEffect(() => {
    if (status === "disconnected") {
      connect().catch(() => {
        // ignore – status will be "error" and button stays gray
      });
    }
  }, [status, connect]);

  const formatTime = secs => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const startCounter = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const pauseCounter = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetCounter = () => {
    pauseCounter();
    setElapsed(0);
  };

  const handleEmergencyCut = () => {
    sendToOBS("SetCurrentProgramScene", { sceneName: "Emergency Cut" });
    setEmergencyActive(true);

    if (emergencyTimerRef.current) {
      clearTimeout(emergencyTimerRef.current);
    }
    emergencyTimerRef.current = setTimeout(() => {
      setEmergencyActive(false);
    }, 5000);
  };

  const handleObsButtonClick = () => {
    if (obsConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex items-center text-sm text-white bg-gray-900 px-4 py-2 border-b border-gray-700">
      {/* Status Buttons (left) */}
      <div className="flex items-center gap-2">
        <StudioButton
          label="OBS"
          full={false}
          color="gray"
          isActive={obsConnected}
          onClick={handleObsButtonClick}
        />
        <StudioButton
          label="Unreal"
          full={false}
          color="gray"
          isActive={unrealConnected}
        />
        <StudioButton
          label="NDI"
          full={false}
          color="gray"
          isActive={ndiConnected}
        />
        <StudioButton
          label="Emergency Cut"
          full={false}
          color="red"
          isActive={emergencyActive}
          onClick={handleEmergencyCut}
        />
      </div>

      {/* Counter (center) */}
      <div className="flex-1 text-center font-mono text-green-400 text-xl tracking-widest">
        {formatTime(elapsed)}
      </div>

      {/* Control Buttons (right) */}
      <div className="flex items-center gap-2">
        <button onClick={startCounter} className="pro-button bg-green-600">
          ▶
        </button>
        <button onClick={pauseCounter} className="pro-button bg-yellow-500">
          ⏸
        </button>
        <button onClick={resetCounter} className="pro-button bg-red-600">
          ⏹
        </button>
        <div className="text-xs opacity-50 ml-2">v0.95</div>
      </div>
    </div>
  );
}
