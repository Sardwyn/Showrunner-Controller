// src/components/StudioClock.jsx
import React, { useEffect, useState } from "react";

export default function StudioClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => n.toString().padStart(2, "0");
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  return (
    <div className="flex flex-col items-end">
      <span className="text-[0.6rem] tracking-[0.22em] uppercase text-emerald-300/70">
        Studio Time
      </span>
      <span className="font-mono text-lg leading-none text-emerald-200 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
        {hh}:{mm}:{ss}
      </span>
    </div>
  );
}
