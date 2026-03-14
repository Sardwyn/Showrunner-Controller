import React, { useEffect, useState } from "react";
import { subscribeEvents } from "../runtime/eventBus";

export default function DebugEventPanel() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      setEvents((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          ...event,
        },
        ...prev.slice(0, 200), // keep last 200 events
      ]);
    });

    return () => {
  try {
    unsubscribe();
  } catch {}
};

  }, []);

  return (
    <div className="pc-panel-content debug-panel">
      <h3 style={{ marginBottom: "8px" }}>Debug Event Monitor</h3>

      <div
        style={{
          fontSize: "12px",
          background: "#111",
          border: "1px solid #333",
          padding: "8px",
          borderRadius: "4px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {events.length === 0 && (
          <div style={{ opacity: 0.6 }}>No events yet…</div>
        )}

        {events.map((evt) => (
          <div
            key={evt.id}
            style={{
              padding: "6px 0",
              borderBottom: "1px solid #222",
              marginBottom: "6px",
            }}
          >
            <div style={{ color: "#6cf" }}>
              <strong>{evt.type}</strong>  
              <span style={{ opacity: 0.6 }}>
                {" "}
                · {evt.source}  
                · {evt.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#000",
                padding: "6px",
                borderRadius: "4px",
                marginTop: "4px",
                fontSize: "11px",
                border: "1px solid #333",
              }}
            >
              {JSON.stringify(evt.payload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
