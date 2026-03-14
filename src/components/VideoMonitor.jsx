// src/components/VideoMonitor.jsx
import React from "react";

export default function VideoMonitor({ type = "program" }) {
  // if you ever want a different variant later you can branch on `type`
  return (
    <div className="monitor-root monitor-program">
      <div className="monitor-header">
        <span>Program • LIVE OUTPUT • 1080p/60</span>
        <div className="monitor-lamps">
          <span className="monitor-lamp ok" />
          <span className="monitor-lamp ok" />
          <span className="monitor-lamp err" />
        </div>
      </div>

      <div className="monitor-background" />
      <div className="monitor-grid" />
      <div className="monitor-safe-frame" />
      <div className="monitor-waveform" />
      <div className="monitor-scanlines" />
      <div className="monitor-frame" />

      <div className="monitor-live">
        <span className="monitor-live-dot" />
        <span>Live</span>
      </div>

      <div className="monitor-title">Gameplay + Host</div>
      <div className="monitor-timecode">00:09:48:02</div>
    </div>
  );
}
