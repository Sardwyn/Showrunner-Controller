// src/components/DebugEventButton.tsx
import React from "react";
import { useRundownEngineContext } from "../rundown/runtime/RundownEngineProvider";

export default function DebugEventButton() {
  const { handleExternalEvent } = useRundownEngineContext();

  const fireRaid = () => {
    handleExternalEvent({
      source: "kick",
      type: "kick.raid",
      payload: {
        viewerCount: 25,
        raiderName: "TestRaider",
      },
      receivedAt: Date.now(),
    });
  };

  return (
    <button
      type="button"
      onClick={fireRaid}
      style={{ padding: "4px 8px", fontSize: 12, marginLeft: 8 }}
    >
      Fire Test Raid
    </button>
  );
}
