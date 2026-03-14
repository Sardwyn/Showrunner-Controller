// src/components/TransitionPanel.jsx
import React, { useCallback, useState } from "react";

/**
 * TransitionPanel
 *
 * Very simple OBS transition controller.
 * Backend endpoint is assumed to be /api/obs/transition – you can wire that
 * into your existing OBS bridge however you like.
 */
async function sendTransitionCommand(payload) {
  try {
    await fetch("/api/obs/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to send OBS transition command", err);
  }
}

export default function TransitionPanel() {
  const [transitionType, setTransitionType] = useState("fade"); // 'cut' | 'fade' | 'stinger'
  const [durationMs, setDurationMs] = useState(300);
  const [isSending, setIsSending] = useState(false);

  const handleTypeChange = useCallback((type) => {
    setTransitionType(type);
    // Optionally push config to OBS immediately
    sendTransitionCommand({ action: "set_config", type, durationMs });
  }, [durationMs]);

  const handleDurationChange = useCallback((e) => {
    const value = Number(e.target.value) || 0;
    setDurationMs(value);
    sendTransitionCommand({ action: "set_config", type: transitionType, durationMs: value });
  }, [transitionType]);

  const handleQuickDuration = useCallback((value) => {
    setDurationMs(value);
    sendTransitionCommand({ action: "set_config", type: transitionType, durationMs: value });
  }, [transitionType]);

  const handleCut = useCallback(async () => {
    setIsSending(true);
    await sendTransitionCommand({ action: "cut" });
    setIsSending(false);
  }, []);

  const handleAuto = useCallback(async () => {
    setIsSending(true);
    await sendTransitionCommand({
      action: "auto",
      type: transitionType,
      durationMs,
    });
    setIsSending(false);
  }, [transitionType, durationMs]);

  return (
    <div className="transition-panel">
      <div className="pc-panel-header">
        <span>Transitions</span>
        <span className="transition-panel-subtitle">
          {transitionType.toUpperCase()} · {durationMs}ms
        </span>
      </div>

      <div className="pc-panel-body">
        {/* Type selector */}
        <div className="transition-row">
          <span className="transition-label">Type</span>
          <div className="transition-type-buttons">
            <button
              className={`pro-button ${transitionType === "cut" ? "preview" : ""}`}
              onClick={() => handleTypeChange("cut")}
            >
              Cut
            </button>
            <button
              className={`pro-button ${transitionType === "fade" ? "preview" : ""}`}
              onClick={() => handleTypeChange("fade")}
            >
              Fade
            </button>
            <button
              className={`pro-button ${transitionType === "stinger" ? "preview" : ""}`}
              onClick={() => handleTypeChange("stinger")}
            >
              Stinger
            </button>
          </div>
        </div>

        {/* Duration selector */}
        <div className="transition-row">
          <span className="transition-label">Duration (ms)</span>
          <div className="transition-duration">
            <input
              type="number"
              min={0}
              step={50}
              value={durationMs}
              onChange={handleDurationChange}
            />
            <div className="transition-duration-quick">
              <button
                className="pro-button"
                onClick={() => handleQuickDuration(150)}
              >
                150
              </button>
              <button
                className="pro-button"
                onClick={() => handleQuickDuration(300)}
              >
                300
              </button>
              <button
                className="pro-button"
                onClick={() => handleQuickDuration(600)}
              >
                600
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="transition-row transition-actions">
          <button
            className="pro-button preview"
            disabled={isSending}
            onClick={handleCut}
          >
            CUT
          </button>
          <button
            className="pro-button live"
            disabled={isSending}
            onClick={handleAuto}
          >
            AUTO
          </button>
        </div>
      </div>
    </div>
  );
}
