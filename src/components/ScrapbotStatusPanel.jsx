import React from "react";

const statusPill = (label, tone = "ok") => {
  const toneClasses =
    tone === "ok"
      ? "bg-emerald-500/15 border-emerald-400/80 text-emerald-200"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-400/80 text-amber-200"
      : "bg-rose-500/10 border-rose-400/80 text-rose-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border ${toneClasses}`}
    >
      {label}
    </span>
  );
};

export default function ScrapbotStatusPanel() {
  // completely fake numbers just to look alive
  const metrics = {
    messagesPerMin: 186,
    commandsPerMin: 24,
    modActionsPerHour: 38,
    activeChannels: 4,
  };

  const recentActions = [
    { time: "00:09:41", type: "Timeout", detail: "@spammer123 • 300s • Caps spam" },
    { time: "00:08:57", type: "Command", detail: "!shoutout @guest_tv" },
    { time: "00:08:12", type: "Filter", detail: "Blocked banned phrase in chat" },
    { time: "00:07:45", type: "Command", detail: "!clip • “Insane finish”" },
  ];

  return (
    <div className="controller-panel">
      <h2 className="controller-panel-title mb-2">Scrapbot Status</h2>

      {/* Top row: connection + instance status */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-[0.16em]">
              Core Service
            </span>
            {statusPill("Connected", "ok")}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-[0.16em]">
              Kick Socket
            </span>
            {statusPill("Subscribed • 3 channels", "ok")}
          </div>
        </div>
        <div className="text-right text-[0.7rem] text-slate-400">
          <div>Node • v20.0</div>
          <div>Latency: 42 ms</div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-[0.7rem]">
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">
            Msg/min
          </div>
          <div className="text-sm font-semibold text-emerald-300">
            {metrics.messagesPerMin}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">
            Cmd/min
          </div>
          <div className="text-sm font-semibold text-sky-300">
            {metrics.commandsPerMin}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">
            Mod/hr
          </div>
          <div className="text-sm font-semibold text-amber-300">
            {metrics.modActionsPerHour}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">
            Channels
          </div>
          <div className="text-sm font-semibold text-violet-300">
            {metrics.activeChannels}
          </div>
        </div>
      </div>

      {/* Recent actions list */}
      <div className="text-[0.7rem] text-slate-300">
        <div className="flex items-center justify-between mb-1">
          <span className="uppercase tracking-[0.18em] text-slate-400">
            Recent Mod Activity
          </span>
          <span className="text-slate-500">Last 10 min</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
          {recentActions.map((a, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-slate-900/70 border border-slate-800/80 rounded-md px-2 py-1"
            >
              <span className="font-mono text-[0.65rem] text-slate-500 mt-[1px]">
                {a.time}
              </span>
              <div className="flex flex-col">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">
                  {a.type}
                </span>
                <span className="text-[0.7rem]">{a.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
