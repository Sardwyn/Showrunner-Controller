import React, { useState, useEffect, useRef } from "react";
import StudioButton from "./StudioButton";
import { sendToOBS } from "../utils/obsClient";
import { useEventBus } from "../runtime/eventBus";

const adBreakScenes = ["Ad Break 1", "Ad Break 2", "Ad Break 3", "Ad Break 4"];
const miscControls = ["Logo Screen", "Stream End"];

const DASHBOARD_BASE = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "https://scraplet.store"
  : "";

export default function GlobalControls() {
  const [lastPlayedIndex, setLastPlayedIndex] = useState(null);
  const [lastPlayedMisc, setLastPlayedMisc] = useState(null);
  const [autoTag, setAutoTag] = useState(() => {
    try { return localStorage.getItem("scraplet_autotag") === "true"; } catch { return false; }
  });
  const [lastHighlight, setLastHighlight] = useState(null);
  const [tagging, setTagging] = useState(false);
  const autoTagRef = useRef(autoTag);
  autoTagRef.current = autoTag;

  // Listen for highlight.detected events from the dashboard SSE
  useEventBus("highlight.detected", async (event) => {
    const hl = event.payload;
    setLastHighlight(hl);

    if (!autoTagRef.current) return;

    // Auto-save OBS replay buffer
    setTagging(true);
    try {
      await sendToOBS("SaveReplayBuffer", {});
      console.log("[AutoTag] Replay buffer saved for highlight:", hl.trigger_signal);

      // Mark as clip-tagged in dashboard
      if (hl.id) {
        await fetch(`${DASHBOARD_BASE}/dashboard/api/highlights/${hl.id}/tag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ clip_path: "obs_replay_buffer" }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("[AutoTag] OBS replay buffer save failed:", e.message);
    } finally {
      setTagging(false);
    }
  });

  const toggleAutoTag = () => {
    const next = !autoTag;
    setAutoTag(next);
    try { localStorage.setItem("scraplet_autotag", String(next)); } catch {}
  };

  const handleAdScene = async (index) => {
    const sceneName = adBreakScenes[index];
    try {
      await sendToOBS("SetCurrentProgramScene", { sceneName });
      setLastPlayedIndex(index);
    } catch (err) {
      alert(`Scene "${sceneName}" not found in OBS.`);
    }
  };

  const handleMiscScene = async (sceneName) => {
    try {
      await sendToOBS("SetCurrentProgramScene", { sceneName });
      setLastPlayedMisc(sceneName);
    } catch (err) {
      alert(`Scene "${sceneName}" not found in OBS.`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {adBreakScenes.map((label, idx) => (
          <StudioButton
            key={label}
            label={label.replace("Ad Break ", "Ad ")}
            onClick={() => handleAdScene(idx)}
            color={lastPlayedIndex === idx ? "green" : "blue"}
            isActive={lastPlayedIndex === idx}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {miscControls.map((ctrl) => (
          <StudioButton
            key={ctrl}
            label={ctrl}
            onClick={() => handleMiscScene(ctrl)}
            color={ctrl === "Emergency Cut" ? "red" : "blue"}
            isActive={false}
          />
        ))}

        {/* Auto-tag toggle */}
        <button
          onClick={toggleAutoTag}
          title="Auto-save OBS replay buffer on highlight detection"
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider border transition-all ${
            autoTag
              ? "bg-amber-500/20 border-amber-400/60 text-amber-300"
              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
          }`}
        >
          {tagging ? "⏺ Clipping..." : autoTag ? "⏺ Auto-tag ON" : "⏺ Auto-tag"}
        </button>
      </div>

      {/* Last highlight indicator */}
      {lastHighlight && (
        <div className="text-[10px] text-amber-300/70 font-mono px-1">
          🔥 Last highlight: {lastHighlight.trigger_signal?.replace("_", " ")} ×{lastHighlight.magnitude}
          {lastHighlight.clip_tagged && " 📎"}
        </div>
      )}
    </div>
  );
}
