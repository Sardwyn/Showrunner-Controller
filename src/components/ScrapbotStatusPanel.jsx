import React, { useState, useEffect } from "react";
import { useStudioContext } from "../runtime/StudioContext";

const DASHBOARD_BASE = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "https://scraplet.store"
  : "";

const statusPill = (label, tone = "ok") => {
  const toneClasses =
    tone === "ok"
      ? "bg-emerald-500/15 border-emerald-400/80 text-emerald-200"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-400/80 text-amber-200"
      : "bg-rose-500/10 border-rose-400/80 text-rose-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border ${toneClasses}`}>
      {label}
    </span>
  );
};

export default function ScrapbotStatusPanel() {
  const { ctx } = useStudioContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Scope to the active Kick channel from studio context
  const channelSlug = ctx?.kick?.channel?.slug
    || ctx?.kick?.channel?.channel_slug
    || ctx?.kick?.channel?.username
    || null;
  const platform = channelSlug ? "kick" : null;

  const fetchStatus = async () => {
    try {
      const params = new URLSearchParams();
      if (channelSlug) params.set("channel_slug", channelSlug);
      if (platform) params.set("platform", platform);
      const res = await fetch(
        `${DASHBOARD_BASE}/dashboard/api/scrapbot/status?${params}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.ok) setData(json);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [channelSlug]);

  const scrapbot = data?.scrapbot;
  const streamer = data?.streamer;
  const intel = data?.room_intel || [];
  const gens = data?.recent_generations || [];

  const liveChannel = intel[0];
  const avgMpm = intel.length
    ? (intel.reduce((s, r) => s + (r.mpm || 0), 0) / intel.length).toFixed(1)
    : null;

  return (
    <div className="controller-panel">
      <h2 className="controller-panel-title mb-2">
        Scrapbot Status
        {channelSlug && (
          <span className="ml-2 text-[0.65rem] text-slate-500 font-normal normal-case tracking-normal">
            #{channelSlug}
          </span>
        )}
      </h2>

      {/* Connection status */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-[0.16em]">Core Service</span>
            {scrapbot
              ? statusPill(scrapbot.online ? "Online" : "Offline", scrapbot.online ? "ok" : "err")
              : statusPill("Connecting…", "warn")}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-[0.16em]">Raffle</span>
            {scrapbot
              ? statusPill(scrapbot.raffle === "running" ? "Running" : scrapbot.raffle, scrapbot.raffle === "running" ? "ok" : "warn")
              : statusPill("—", "warn")}
          </div>
        </div>
        <div className="text-right text-[0.7rem] text-slate-400">
          {error && <div className="text-rose-400 text-[0.65rem]">{error}</div>}
          <div className="text-slate-500 text-[0.6rem]">Refreshes every 15s</div>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[0.7rem]">
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">Msg/min</div>
          <div className="text-sm font-semibold text-emerald-300">
            {liveChannel?.mpm ?? avgMpm ?? "—"}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">Engagement</div>
          <div className="text-sm font-semibold text-sky-300">
            {liveChannel?.engagement_index != null ? liveChannel.engagement_index.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">Viewers</div>
          <div className="text-sm font-semibold text-violet-300">
            {liveChannel?.viewer_count ?? "—"}
          </div>
        </div>
      </div>

      {/* Platform stats - scoped to active channel's platform */}
      {streamer?.platform_stats?.length > 0 && (
        <div className="mb-3 text-[0.68rem] text-slate-300 bg-slate-900/50 border border-slate-700/60 rounded-lg px-2 py-1.5">
          {streamer.platform_stats.map((s, i) => (
            <div key={i} className="flex gap-3 flex-wrap">
              <span className="text-slate-400 uppercase tracking-[0.12em]">{s.platform}</span>
              <span>{(s.followers || 0).toLocaleString()} followers</span>
              <span>Avg CCV: {s.ccv ?? "?"}</span>
              <span>Engagement: {s.engagement ?? "?"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Session averages */}
      {streamer?.session_averages && (
        <div className="mb-3 text-[0.68rem] text-slate-300 bg-slate-900/50 border border-slate-700/60 rounded-lg px-2 py-1.5">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">7-day averages</div>
          <div className="flex gap-3 flex-wrap">
            <span>{streamer.session_averages.total_streams ?? 0} streams</span>
            <span>{streamer.session_averages.avg_duration_minutes ?? "?"} min avg</span>
            <span>{streamer.session_averages.avg_messages_per_stream ?? "?"} msgs avg</span>
            <span>{streamer.session_averages.avg_messages_per_minute ?? "?"} msg/min</span>
          </div>
        </div>
      )}

      {/* Top chatters */}
      {streamer?.top_chatters?.length > 0 && (
        <div className="mb-3 text-[0.68rem]">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">Top chatters</div>
          <div className="flex flex-wrap gap-1">
            {streamer.top_chatters.map((c, i) => (
              <span key={i} className="bg-slate-800/80 border border-slate-700/60 rounded px-1.5 py-0.5 text-slate-300">
                {c.username} <span className="text-slate-500">{c.message_count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent generations */}
      {gens.length > 0 && (
        <div className="text-[0.68rem]">
          <div className="text-slate-400 uppercase tracking-[0.14em] mb-1">Recent generations</div>
          <div className="space-y-1">
            {gens.map((g, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-900/70 border border-slate-800/80 rounded-md px-2 py-1">
                <span className={`text-[0.65rem] uppercase tracking-[0.12em] ${g.status === "done" ? "text-emerald-400" : g.status === "failed" ? "text-rose-400" : "text-amber-400"}`}>
                  {g.status}
                </span>
                <span className="text-slate-400">{g.job_type.replace("image_", "")}</span>
                <span className="text-slate-500 ml-auto">
                  {new Date(g.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="text-slate-500 text-[0.7rem] text-center py-4">Loading…</div>
      )}
    </div>
  );
}
