// src/components/AudioPanel.jsx
import React from "react";

const channels = [
  { id: "MIC 1", color: "emerald", vuActive: 10, faderClass: "h-3/4" },
  { id: "MIC 2", color: "sky", vuActive: 8, faderClass: "h-2/3" },
  { id: "DESKTOP", color: "violet", vuActive: 7, faderClass: "h-1/2" },
  { id: "GAME", color: "amber", vuActive: 9, faderClass: "h-4/5" },
  { id: "MUSIC", color: "rose", vuActive: 6, faderClass: "h-2/3" },
];

const pipColor = (color) => {
  const map = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    violet: "bg-violet-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
  };
  return map[color] || "bg-slate-400";
};

const pipOff = "bg-slate-900 border border-slate-800";

const makePips = (activeCount, color) => {
  const total = 12;
  return Array.from({ length: total }).map((_, idx) => {
    const isActive = idx < activeCount;
    return (
      <div
        key={idx}
        className={`h-1.5 rounded-sm ${
          isActive ? pipColor(color) : pipOff
        }`}
      />
    );
  });
};

export default function AudioPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3 flex flex-col items-center"
          >
            {/* LED-style label */}
            <div className="w-full mb-2">
              <div className="w-full px-2 py-1 rounded-sm bg-gradient-to-b from-emerald-400/25 via-emerald-700/60 to-emerald-950/90 border border-emerald-300/70 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                <div className="text-[0.65rem] font-mono tracking-[0.25em] text-emerald-100 text-center uppercase">
                  {ch.id}
                </div>
              </div>
            </div>

            {/* VU meter */}
            <div className="w-4 flex flex-col-reverse gap-0.5 mb-3">
              {makePips(ch.vuActive, ch.color)}
            </div>

            {/* Fader bar */}
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="relative w-8 h-24 rounded-full bg-slate-950 border border-slate-700 shadow-inner flex items-center justify-center">
                {/* Track */}
                <div className="w-1.5 h-20 rounded-full bg-slate-800 border border-slate-700" />

                {/* Fill / level */}
                <div
                  className={`absolute bottom-4 w-1.5 rounded-full ${pipColor(
                    ch.color
                  )} ${ch.faderClass}`}
                />

                {/* Fader knob */}
                <div className="absolute bottom-3 w-5 h-3 rounded-full bg-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.9)] border border-slate-400" />
              </div>
              <div className="text-[0.6rem] text-slate-500 tracking-[0.16em] uppercase">
                Level
              </div>
            </div>

            {/* Routing selector */}
            <select className="bg-slate-950 border border-slate-700 text-xs px-1.5 py-0.5 rounded mb-3 text-slate-300 w-full text-center">
              <option>Main</option>
              <option>AUX 1</option>
              <option>AUX 2</option>
              <option>Monitor</option>
            </select>

            {/* Mute / Kill */}
            <div className="flex flex-col gap-1 items-center">
              <button className="px-2 py-1 rounded border border-amber-400 text-amber-300 bg-amber-500/10 text-[0.65rem] uppercase tracking-[0.12em] w-full">
                Mute
              </button>
              <button className="px-2 py-1 rounded border border-rose-500 text-rose-300 bg-rose-600/20 text-[0.65rem] uppercase tracking-[0.12em] w-full">
                Kill
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
