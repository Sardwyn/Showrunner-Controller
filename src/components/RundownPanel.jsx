// src/components/RundownPanel.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRundownEngineContext } from "../rundown/runtime/RundownEngineProvider";
import TemplateSelector from "./TemplateSelector";
import { useObsConnection } from "../hooks/useObsConnection";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function formatTime(sec) {
  if (sec == null) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function signedTime(sec) {
  const sign = sec >= 0 ? "+" : "-";
  return sign + formatTime(Math.abs(sec));
}

function typeLabel(type) {
  switch (type) {
    case "ad":
      return "Ad";
    case "chat":
      return "Chat";
    case "vt":
      return "VT";
    case "gfx":
      return "GFX";
    case "break":
      return "Break";
    case "segment":
    default:
      return "Segment";
  }
}

function useOnAirSeconds(startedAt) {
  const [onAir, setOnAir] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setOnAir(0);
      return;
    }
    const compute = () => {
      const now = Math.floor(Date.now() / 1000);
      setOnAir(Math.max(0, now - startedAt));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return onAir;
}

function getSceneRoleFromCard(card) {
  if (!card?.actions) return null;
  const obsAction = card.actions.find(a => a.kind === "obsScene");
  return obsAction?.config?.role ?? null;
}

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */

export default function RundownPanel() {
  const {
    show,
    currentItem,
    groups,
    items,
    startShow,
    nextItem,
    selectItem,
    autoNext,
    toggleAutoNext,
    skipNextItem,
  } = useRundownEngineContext();

  // OBS connection – used to stop stream when show ends
  const obsConnection = useObsConnection ? useObsConnection() : null;

  const [selectedGroupId, setSelectedGroupId] = useState(
    groups.at(-1)?.id ?? null
  );
  const [followPlayhead, setFollowPlayhead] = useState(true);
  const currentItemRef = useRef(null);
  const programmaticScrollRef = useRef(false);

  const showTitle = show?.title ?? "Untitled Show";
  const onAirSeconds = useOnAirSeconds(show?.startedAt ?? null);
  const showStatus = show?.startedAt ? "LIVE" : "OFFLINE";

  // Build UI groups
  const uiGroups = useMemo(
    () =>
      groups.map(g => ({
        ...g,
        items: g.itemIds.map(id => items[id]).filter(Boolean),
      })),
    [groups, items]
  );

  const typeOrder = ["segment", "ad", "break", "chat", "vt", "gfx"];

  // Type usage for footer mapping row
  const typeUsage = useMemo(() => {
    const out = {};
    typeOrder.forEach(t => (out[t] = { hasAny: false, hasMapped: false }));
    Object.values(items).forEach(it => {
      const t = it.type || "segment";
      if (!out[t]) return;
      out[t].hasAny = true;
      if (getSceneRoleFromCard(it)) out[t].hasMapped = true;
    });
    return out;
  }, [items]);

  // Flow + show totals + show progress
  const flowStats = useMemo(() => {
    let actual = 0;
    let planned = 0;

    Object.values(items).forEach(it => {
      const duration = typeof it.duration === "number" ? it.duration : 0;
      const elapsed = typeof it.elapsed === "number" ? it.elapsed : 0;
      const status = it.status || "pending";

      if (duration > 0) planned += duration;

      if (["live", "done", "skipped"].includes(status)) {
        actual += elapsed;
      }
    });

    return {
      flowDeltaSeconds: actual - planned,
      totalPlannedSeconds: planned,
      totalElapsedSeconds: actual,
    };
  }, [items]);

  const { flowDeltaSeconds, totalPlannedSeconds, totalElapsedSeconds } =
    flowStats;

  const flowClass = flowDeltaSeconds >= 0 ? "over" : "under";

  const showProgressPct =
    totalPlannedSeconds > 0
      ? Math.max(
          0,
          Math.min(100, (totalElapsedSeconds / totalPlannedSeconds) * 100)
        )
      : 0;

  // Current item details
  const currentType = currentItem?.type || "segment";
  const currentSceneRole = getSceneRoleFromCard(currentItem);
  const currentDuration = currentItem?.duration ?? null;
  const currentElapsed = currentItem?.elapsed ?? 0;

  const currentHasDuration =
    typeof currentDuration === "number" && currentDuration > 0;
  const currentIsOverrun =
    currentHasDuration && currentElapsed > currentDuration;
  const currentRemainingSeconds = currentHasDuration
    ? Math.max(0, currentDuration - currentElapsed)
    : null;
  const currentRemainingPct = currentHasDuration
    ? (currentRemainingSeconds / currentDuration) * 100
    : 100;
  const currentProgressPct =
    currentHasDuration && currentDuration > 0
      ? Math.min(100, (currentElapsed / currentDuration) * 100)
      : 0;

  const runModeLabel = autoNext ? "AUTO" : "MANUAL";
  const currentReadyForNext =
    currentHasDuration && currentElapsed >= currentDuration;

  // Can we safely start?
  const canStart = useMemo(
    () =>
      Object.values(items).some(
        it => typeof it.duration === "number" && it.duration > 0
      ),
    [items]
  );

  // Determine if current card is the last one in the whole rundown
  const lastItemId = useMemo(() => {
    const flat = [];
    uiGroups.forEach(group => {
      (group.items || []).forEach(it => flat.push(it));
    });
    if (!flat.length) return null;
    return flat[flat.length - 1].id;
  }, [uiGroups]);

  const isLastCard = !!currentItem && currentItem.id === lastItemId;

  const handleEndButtonClick = () => {
    // Normal behaviour: move to next card
    if (typeof nextItem === "function") {
      nextItem();
    }

    // If this was the last card, try to stop the stream in OBS
    if (isLastCard && obsConnection) {
      try {
        if (typeof obsConnection.stopStream === "function") {
          obsConnection.stopStream();
        } else {
          console.warn(
            "[Rundown] OBS stopStream() not available on this connection."
          );
        }
      } catch (err) {
        console.error("[Rundown] Failed to stop OBS stream:", err);
      }
    }
  };

  // Active interrupt overlay:
  // - base card = top of interruptStack (the thing we were on)
  // - active card = currentItem (the interrupt card now live)
  const interruptFrame =
    show?.interruptStack &&
    Array.isArray(show.interruptStack) &&
    show.interruptStack.length
      ? show.interruptStack[show.interruptStack.length - 1]
      : null;

  const interruptBaseItem =
    interruptFrame && interruptFrame.itemId ? items[interruptFrame.itemId] : null;

  const activeInterruptCard =
    interruptFrame && currentItem && currentItem.id !== interruptFrame.itemId
      ? currentItem
      : null;

  const hasActiveInterrupt =
    !!interruptFrame && !!interruptBaseItem && !!activeInterruptCard;

  // Keep selected group valid
  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null);
      return;
    }
    if (!groups.some(g => g.id === selectedGroupId)) {
      setSelectedGroupId(groups.at(-1).id);
    }
  }, [groups, selectedGroupId]);

  // Auto-scroll
  useEffect(() => {
    if (!followPlayhead) return;
    if (!currentItemRef.current) return;

    programmaticScrollRef.current = true;
    currentItemRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 250);
  }, [currentItem?.id, followPlayhead]);

  const handleUserScroll = () => {
    if (programmaticScrollRef.current) return;
    setFollowPlayhead(false);
  };

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */

  return (
    <div className="pc-panel-body rundown-panel">
      {/* HEADER */}
      <div className="rundown-header">
        <div className="rundown-header-main">
          <div className="rundown-title-row">
            <span className="rundown-title">{showTitle}</span>
            <span
              className={
                "status-pill " +
                (showStatus === "LIVE"
                  ? "status-pill-live"
                  : "status-pill-offline")
              }
            >
              {showStatus}
            </span>
          </div>

          {/* Template load / manage controls */}
          <div className="rundown-template-tools">
            <TemplateSelector />
          </div>
        </div>

        <div className="rundown-header-right">
          {/* timing */}
          <div className="rundown-timing">
            <div className="rundown-timing-row">
              <span className="rundown-timing-label">On Air</span>
              <span className="rundown-timing-value">
                {formatTime(onAirSeconds)}
              </span>
            </div>
            <div className={`rundown-timing-row ${flowClass}`}>
              <span className="rundown-timing-label">Flow</span>
              <span className="rundown-timing-value">
                {signedTime(flowDeltaSeconds)}
              </span>
            </div>
          </div>

          {/* transport */}
          <button
            className="rundown-start-button"
            disabled={!!show?.startedAt || !canStart}
            onClick={() => {
              if (!canStart) {
                console.warn(
                  "[Rundown] Cannot start show: no timed items found."
                );
                return;
              }
              startShow();
            }}
          >
            Start
          </button>

          <button
            className={
              "rundown-auto-button " + (autoNext ? "is-active" : "")
            }
            onClick={toggleAutoNext}
          >
            Auto
          </button>

          <button
            className={
              "rundown-next-button " +
              (currentIsOverrun
                ? "next-overrun"
                : currentHasDuration && currentRemainingPct < 100
                ? "next-underrun"
                : "")
            }
            onClick={nextItem}
          >
            Next
          </button>

          <button
            type="button"
            className="rundown-skip-button"
            onClick={() => skipNextItem()}
          >
            SKIP
          </button>

          <button
            className={
              "follow-playhead-toggle " +
              (followPlayhead ? "is-active" : "")
            }
            onClick={() => setFollowPlayhead(v => !v)}
          >
            Follow
          </button>
        </div>
      </div>

      {/* NOW LIVE STRIP */}
      <div className="rundown-live-strip">
        <div className="rundown-live-grid">
          {/* LEFT CELL: NOW + title + mode line */}
          <div className="rundown-live-cell-left">
            <div className="rundown-live-topline">
              <span className="rundown-live-label">NOW</span>
              <span className="rundown-live-title">
                {currentItem ? currentItem.title : "No active item"}
              </span>
            </div>

            <div className="rundown-live-subline">
              <span className="runmode-label">{runModeLabel}</span>

              {currentHasDuration && (
                <>
                  <span className="runmode-dot">·</span>
                  <span
                    className={
                      "runmode-status-inline " +
                      (currentReadyForNext ? "ready" : "running")
                    }
                  >
                    {currentReadyForNext ? "READY FOR NEXT" : "RUNNING"}
                  </span>
                </>
              )}

              {isLastCard && (
                <>
                  <span className="runmode-dot">·</span>
                  <span className="runmode-ending">SHOW ENDING</span>
                </>
              )}
            </div>
          </div>

          {/* RIGHT CELL: META LINE + BIG END SEGMENT/SHOW BUTTON */}
          <div className="rundown-live-cell-right">
            <div className="rundown-live-meta-inline">
              <span className="pill pill-type">
                {currentType.toUpperCase()}
              </span>
              <span className="pill">
                {currentSceneRole || "NO SCENE ROLE"}
              </span>
              {currentHasDuration && (
                <span className="pill">
                  Target {formatTime(currentDuration)}
                </span>
              )}
              <span
                className={
                  "pill pill-live " +
                  (currentIsOverrun ? "pill-live-overrun" : "")
                }
              >
                Elapsed {formatTime(currentElapsed)}
              </span>
            </div>

            <button
              className="pro-button live end-segment-button"
              type="button"
              onClick={handleEndButtonClick}
            >
              {isLastCard ? "END SHOW" : "END SEGMENT"}
            </button>
          </div>
        </div>

        {/* SHOW-LEVEL PROGRESS BAR (entire rundown) */}
        {totalPlannedSeconds > 0 && (
          <div className="rundown-live-progress">
            <div
              className="rundown-live-progress-fill"
              style={{ width: `${showProgressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* GROUPS */}
      <div className="rundown-groups" onScroll={handleUserScroll}>
        {uiGroups.map(group => {
          const isSelected = group.id === selectedGroupId;

          return (
            <div
              key={group.id}
              className={
                "rundown-group " +
                (isSelected ? "rundown-group-selected" : "")
              }
              onClick={() => setSelectedGroupId(group.id)}
            >
              <div className="rundown-group-header">
                <span className="rundown-group-title">{group.title}</span>
              </div>

              <div className="rundown-group-items">
                {group.items.map(item => {
                  const isCurrent = currentItem?.id === item.id;
                  const status = item.status || "pending";
                  const itemType = item.type || "segment";
                  const sceneRole = getSceneRoleFromCard(item);

                  const hasDuration =
                    typeof item.duration === "number" && item.duration > 0;

                  let durationLabel = null;
                  let progressPct = 0;
                  let remPct = 100;
                  let overrun = false;

                  if (hasDuration) {
                    if (isCurrent && currentHasDuration) {
                      const elapsed = currentElapsed;
                      if (elapsed <= item.duration) {
                        const remaining = item.duration - elapsed;
                        durationLabel = `Rem ${formatTime(remaining)}`;
                        remPct = (remaining / item.duration) * 100;
                        progressPct = Math.min(
                          100,
                          (elapsed / item.duration) * 100
                        );
                      } else {
                        overrun = true;
                        const over = elapsed - item.duration;
                        durationLabel = `+${formatTime(over)}`;
                        remPct = 0;
                        progressPct = 100;
                      }
                    } else {
                      durationLabel = formatTime(item.duration);
                      remPct = 100;
                      progressPct =
                        status === "done" || status === "skipped" ? 100 : 0;
                    }
                  }

                  const isInterruptBase =
                    hasActiveInterrupt &&
                    interruptBaseItem &&
                    item.id === interruptBaseItem.id;

                  return (
                    <div
                      key={item.id}
                      ref={isCurrent ? currentItemRef : null}
                      className={
                        `rundown-item status-${status}` +
                        (isCurrent ? " rundown-item-current" : "") +
                        ` rundown-item-type-${itemType}`
                      }
                      onClick={() => selectItem(item.id)}
                    >
                      {hasDuration && (
                        <div className="rundown-item-progress">
                          <div
                            className="rundown-item-progress-fill"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}

                      <div className="rundown-item-main">
                        <span className="rundown-item-title">
                          {item.title}
                        </span>
                      </div>

                      <div className="rundown-item-meta">
                        <span className="pill pill-type">
                          {itemType.toUpperCase()}
                        </span>
                        <span className="pill">
                          {sceneRole || "No Scene Role"}
                        </span>

                        {durationLabel && (
                          <span
                            className={
                              "pill rundown-remaining-pill " +
                              (overrun
                                ? "remaining-overrun"
                                : remPct > 20
                                ? "remaining-green"
                                : remPct > 5
                                ? "remaining-yellow"
                                : "remaining-red") +
                              (!overrun && remPct <= 2
                                ? " remaining-critical-flash"
                                : "")
                            }
                          >
                            {durationLabel}
                          </span>
                        )}

                        <span className="rundown-item-status">
                          {status.toUpperCase()}
                        </span>
                      </div>

                      {/* INTERRUPT OVERLAY */}
                      {isInterruptBase && activeInterruptCard && (
                        <div className="rundown-interrupt-overlay">
                          <div className="rundown-interrupt-header">
                            <span className="pill pill-interrupt">
                              INTERRUPT
                            </span>
                            <span className="rundown-interrupt-type">
                              {(activeInterruptCard.type || "event").toUpperCase()}
                            </span>
                          </div>

                          <div className="rundown-interrupt-title">
                            {activeInterruptCard.title}
                          </div>

                          {typeof activeInterruptCard.duration === "number" &&
                            activeInterruptCard.duration > 0 && (
                              <div className="rundown-interrupt-meta">
                                <span className="pill">
                                  Target{" "}
                                  {formatTime(activeInterruptCard.duration)}
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER – mapping overview */}
      <form className="rundown-footer">
        <div className="rundown-routing-row">
          <div className="routing-types-row">
            {typeOrder.map(t => {
              const u = typeUsage[t];
              const cls = u.hasMapped
                ? "routing-pill-mapped"
                : u.hasAny
                ? "routing-pill-unmapped"
                : "routing-pill-unused";
              return (
                <span key={t} className={`pill routing-pill ${cls}`}>
                  {typeLabel(t).toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
}
