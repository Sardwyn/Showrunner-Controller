import React, { useState } from "react";

const platforms = ["All", "Kick", "Twitch", "YouTube"];

const fakeMessages = [
  { platform: "Kick", user: "host_tv", role: "HOST", text: "Alright chat, we're going live in 60..." },
  { platform: "Kick", user: "scrapbot", role: "BOT", text: "Remember: !so <name> for shoutouts." },
  { platform: "Twitch", user: "mod_jane", role: "MOD", text: "Pinned today's sponsor link." },
  { platform: "Kick", user: "viewer123", role: null, text: "LET'S GOOOOOO 🙌" },
  { platform: "YouTube", user: "VOD_guy", role: null, text: "Watching from the future 👀" },
  { platform: "Kick", user: "scrapbot", role: "BOT", text: "Timed out @spammer123 for ALL CAPS." },
];

const roleBadge = (role) => {
  if (!role) return null;
  const map = {
    HOST: "bg-sky-500/20 border-sky-400/80 text-sky-200",
    MOD: "bg-emerald-500/15 border-emerald-400/80 text-emerald-200",
    BOT: "bg-violet-500/20 border-violet-400/80 text-violet-200",
  };
  return (
    <span
      className={`text-[0.6rem] px-1.5 py-0.5 rounded-full border uppercase tracking-[0.16em] ${map[role] || ""}`}
    >
      {role}
    </span>
  );
};

const platformTag = (p) => {
  const map = {
    Kick: "bg-emerald-500/10 border-emerald-400/60 text-emerald-200",
    Twitch: "bg-violet-500/10 border-violet-400/60 text-violet-200",
    YouTube: "bg-rose-500/10 border-rose-400/60 text-rose-200",
  };
  return (
    <span
      className={`text-[0.6rem] px-1.5 py-0.5 rounded-full border uppercase tracking-[0.14em] ${map[p] || ""}`}
    >
      {p}
    </span>
  );
};

export default function ChatPanel() {
  const [activePlatform, setActivePlatform] = useState("All");

  const filtered =
    activePlatform === "All"
      ? fakeMessages
      : fakeMessages.filter((m) => m.platform === activePlatform);

  return (
    <div className="controller-panel">
      <div className="flex items-center justify-between mb-2">
        <h2 className="controller-panel-title mb-0">Chat Monitor</h2>
        <div className="flex gap-1 text-[0.7rem]">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActivePlatform(p)}
              className={`px-2 py-0.5 rounded-full border text-[0.65rem] uppercase tracking-[0.16em]
                ${
                  activePlatform === p
                    ? "border-sky-400 bg-sky-500/15 text-sky-100"
                    : "border-slate-600 bg-slate-900/80 text-slate-300"
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat log */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-[0.75rem] flex flex-col gap-1 max-h-52 overflow-y-auto">
        {filtered.map((m, idx) => (
          <div key={idx} className="flex gap-2">
            <div className="flex flex-col items-end gap-1 min-w-[96px] pr-1 border-r border-slate-800/80">
              <span className="font-semibold text-slate-100">{m.user}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {roleBadge(m.role)}
                {platformTag(m.platform)}
              </div>
            </div>
            <div className="flex-1 text-slate-200 leading-snug pt-0.5">
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Fake input (for visuals only) */}
      <div className="mt-2 flex items-center gap-2 text-[0.7rem]">
        <div className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-full px-3 py-1.5 text-slate-500">
          Type a message as Scrapbot…
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full border border-sky-400 bg-sky-500/20 text-sky-100 uppercase tracking-[0.16em] text-[0.65rem]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
