// src/components/SubathonTimerPanel.tsx
// Live subathon timer control panel for the showrunner controller.

import { useState, useEffect, useRef } from "react";

interface TimerState {
  status: "stopped" | "running" | "paused" | "ended";
  remainingMs: number;
  config: {
    startMs: number;
    addPerSub: number;
    addPerFollow: number;
    addPerTipPerUnit: number;
    addPerGiftSub: number;
    addPerRaid: number;
  };
}

function pad(n: number) { return n < 10 ? "0" + n : String(n); }

function formatTime(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

const DEFAULT_STATE: TimerState = {
  status: "stopped",
  remainingMs: 0,
  config: {
    startMs: 2 * 60 * 60 * 1000,
    addPerSub: 5 * 60 * 1000,
    addPerFollow: 30 * 1000,
    addPerTipPerUnit: 60 * 1000,
    addPerGiftSub: 10 * 60 * 1000,
    addPerRaid: 2 * 60 * 1000,
  },
};

export default function SubathonTimerPanel() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const [startMin, setStartMin] = useState(120);
  const [addPerSubMin, setAddPerSubMin] = useState(5);
  const [addPerFollowSec, setAddPerFollowSec] = useState(30);
  const [addPerGiftSubMin, setAddPerGiftSubMin] = useState(10);
  const [manualAddMin, setManualAddMin] = useState(1);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  const base = (window as any).DASHBOARD_URL || "";

  async function api(path: string, body?: any) {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status) setState(d as TimerState);
    }
  }

  // Poll state every 5s as fallback
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${base}/dashboard/api/subathon/state`, { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          setState(d);
          lastUpdateRef.current = Date.now();
        }
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, []);

  // Local tick for smooth display
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (state.status === "running") {
      lastUpdateRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        const elapsed = Date.now() - lastUpdateRef.current;
        lastUpdateRef.current = Date.now();
        setState(prev => ({
          ...prev,
          remainingMs: Math.max(0, prev.remainingMs - elapsed),
        }));
      }, 100);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.status]);

  const isRunning = state.status === "running";
  const isPaused  = state.status === "paused";
  const isStopped = state.status === "stopped" || state.status === "ended";
  const urgent    = state.remainingMs > 0 && state.remainingMs < 5 * 60 * 1000;

  const statusColor = isStopped ? "#64748b" : isRunning ? "#22c55e" : "#f59e0b";

  return (
    <div style={{ padding: "12px", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", fontSize: 13 }}>
      {/* Clock display */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: 4 }}>
          Subathon Timer
        </div>
        <div style={{
          fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1,
          color: urgent ? "#ef4444" : "#ffffff",
          transition: "color 0.3s",
        }}>
          {formatTime(state.remainingMs)}
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
          <span style={{ fontSize: 11, opacity: 0.6, textTransform: "capitalize" }}>{state.status}</span>
        </div>
        {lastAdded && (
          <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>{lastAdded}</div>
        )}
      </div>

      {/* Main controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => api("/dashboard/api/subathon/start", { config: { startMin, addPerSubMin, addPerFollowSec, addPerGiftSubMin } })}
          style={{ padding: "6px 4px", borderRadius: 6, border: "1px solid #166534", background: "#14532d", color: "#86efac", fontSize: 11, cursor: "pointer" }}
        >▶ Start</button>
        <button
          onClick={() => api(isRunning ? "/dashboard/api/subathon/pause" : "/dashboard/api/subathon/resume")}
          disabled={isStopped}
          style={{ padding: "6px 4px", borderRadius: 6, border: "1px solid #78350f", background: "#451a03", color: "#fcd34d", fontSize: 11, cursor: isStopped ? "not-allowed" : "pointer", opacity: isStopped ? 0.4 : 1 }}
        >{isRunning ? "⏸ Pause" : "▶ Resume"}</button>
        <button
          onClick={() => api("/dashboard/api/subathon/stop")}
          disabled={isStopped}
          style={{ padding: "6px 4px", borderRadius: 6, border: "1px solid #7f1d1d", background: "#450a0a", color: "#fca5a5", fontSize: 11, cursor: isStopped ? "not-allowed" : "pointer", opacity: isStopped ? 0.4 : 1 }}
        >■ Stop</button>
      </div>

      {/* Manual add time */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>Add time:</span>
        <button onClick={() => { api("/dashboard/api/subathon/add", { ms: 60000 }); setLastAdded("+1 min added"); setTimeout(() => setLastAdded(null), 2000); }}
          style={{ flex: 1, padding: "5px 4px", borderRadius: 6, border: "1px solid #312e81", background: "#1e1b4b", color: "#a5b4fc", fontSize: 11, cursor: "pointer" }}>+1 min</button>
        <button onClick={() => { api("/dashboard/api/subathon/add", { ms: 300000 }); setLastAdded("+5 min added"); setTimeout(() => setLastAdded(null), 2000); }}
          style={{ flex: 1, padding: "5px 4px", borderRadius: 6, border: "1px solid #312e81", background: "#1e1b4b", color: "#a5b4fc", fontSize: 11, cursor: "pointer" }}>+5 min</button>
        <input type="number" value={manualAddMin} onChange={e => setManualAddMin(Number(e.target.value))} min={1} max={60}
          style={{ width: 40, padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "#161618", color: "#e2e8f0", fontSize: 11, textAlign: "center" }} />
        <button onClick={() => { api("/dashboard/api/subathon/add", { ms: manualAddMin * 60000 }); setLastAdded(`+${manualAddMin} min added`); setTimeout(() => setLastAdded(null), 2000); }}
          style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "#1a1a2a", color: "#e2e8f0", fontSize: 11, cursor: "pointer" }}>+</button>
      </div>

      {/* Config */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 11, opacity: 0.5, cursor: "pointer", userSelect: "none" }}>Timer config</summary>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Start (min)", val: startMin, set: setStartMin },
            { label: "+Sub (min)", val: addPerSubMin, set: setAddPerSubMin },
            { label: "+Follow (sec)", val: addPerFollowSec, set: setAddPerFollowSec },
            { label: "+Gift sub (min)", val: addPerGiftSubMin, set: setAddPerGiftSubMin },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, opacity: 0.5 }}>{label}</span>
              <input type="number" value={val} onChange={e => set(Number(e.target.value))} min={0}
                style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "#161618", color: "#e2e8f0", fontSize: 11 }} />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
