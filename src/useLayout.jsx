// src/useLayout.jsx
import { useState, useCallback } from "react";
import { layoutConfig, MODES } from "./layoutConfig";

export function useLayout(initialMode = MODES.LIVE_GAMEPLAY) {
  const [mode, setMode] = useState(initialMode);

  const getPanelsForZone = useCallback(
    (zone) => {
      const configForMode = layoutConfig[mode] || [];
      return configForMode
        .filter((panel) => panel.zone === zone)
        .sort((a, b) => a.order - b.order);
    },
    [mode]
  );

  // Placeholder for future event-driven changes.
  // You can swap this for an event emitter subscription.
  const changeMode = useCallback((nextMode) => {
    if (!layoutConfig[nextMode]) return; // ignore bad modes
    setMode(nextMode);
  }, []);

  return {
    mode,
    changeMode,
    getPanelsForZone,
    MODES,
  };
}
