// src/components/RundownPanel.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRundownEngineContext } from "../rundown/runtime/RundownEngineProvider";

// ----- Time helpers -----
function formatTime(sec) {
  if (sec === undefined || sec === null) return "--:--";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
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

// Simple on-air timer derived from show.startedAt (epoch seconds)
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
    const id = window.setInterval(compute, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return onAir;
}

// Extract the primary obsScene role from a card's actions (if any)
function getSceneRoleFromCard(card) {
  if (!card || !Array.isArray(card.actions)) return null;
  const obsAction = card.actions.find(a => a.kind === "obsScene");
  if (!obsAction || !obsAction.config) return null;
  return obsAction.config.role || null;
}

export default function RundownPanel() {
  const {
    show,
    currentItem,
    groups,
    items,
    startShow,
    selectItem,
    nextItem,
    autoNext,
    toggleAutoNext,
  } = useRundownEngineContext();

  const currentItemRef = useRef(null);

  const [selectedGroupId, setSelectedGroupId] = useState(
    groups[groups.length - 1]?.id || null
  );

  // Keep selected group valid when groups change
  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null);
      return;
    }
    if (!groups.some(g => g.id === selectedGroupId)) {
      setSelectedGroupId(groups[groups.length - 1].id);
    }
  }, [groups, selectedGroupId]);

  const showTitle = show?.title || "Untitled Show";
  const onAirSeconds = useOnAirSeconds(show?.startedAt ?? null);

  // Build UI groups from engine structure
  const uiGroups = useMemo(
    () =>
      (groups || []).map(group => {
        const groupItems = (group.itemIds || [])
          .map(id => items[id])
          .filter(Boolean);
        return { ...group, items: groupItems };
      }),
    [groups, items]
  );

  // FLOW OPTION B:
  // Flow = (sum actual elapsed of played cards) - (sum planned durations of those cards)
  const flowDeltaSeconds = useMemo(() => {
    let actual = 0;
    let planned = 0;

    Object.values(items).forEach(it => {
      const status = it.status || "pending";

      // Only count cards that have actually participated in the show
      if (status === "live" || status === "done" || status === "skipped") {
        const elapsed = typeof it.elapsed === "number" ? it.elapsed : 0;
        const duration = typeof it.duration === "number" ? it.duration : 0;

        // If skipped: elapsed will usually be 0 → you're "ahead" by its duration.
        actual += elapsed;
        planned += duration;
      }
    });

    return actual - planned;
  }, [items]);

  const flowClass = flowDeltaSeconds >= 0 ? "over" : "under";

  const typeOrder = ["segment", "ad", "break", "chat", "vt", "gfx"];

  const currentSceneRole = getSceneRoleFromCard(currentItem);
  const currentDuration =
    typeof currentItem?.duration === "number" ? currentItem.duration : null;
  const currentElapsed =
    typeof currentItem?.elapsed === "number" ? currentItem.elapsed : 0;
  const currentProgressPct =
    currentDuration && currentDuration > 0
      ? Math.max(0, Math.min(100, (currentElapsed / currentDuration) * 100))
      : 0;

        // Auto-scroll current item into view when the playhead moves
  useEffect(() => {
    if (!currentItemRef.current) return;

    try {
      currentItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    } catch (err) {
      console.warn("[Rundown] scrollIntoView failed:", err);
    }
  }, [currentItem?.id]);


  return (
    <div className="pc-panel-body rundown-panel">
      {/* Header */}
      <div className="rundown-header">
        <div className="rundown-header-main">
          <div className="rundown-title">{showTitle}</div>
          <button className="rundown-template-button">Template ▾</button>
        </div>

        <div className="rundown-header-right">
          {/* On-Air + Flow Timing */}
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

          {/* Transport controls */}
          <button
            type="button"
            className="rundown-start-button"
            onClick={() => startShow()}
            disabled={!!show?.startedAt}
          >
            Start
          </button>

          <button
  type="button"
  className={`rundown-auto-button ${autoNext ? "is-active" : ""}`}
  onClick={toggleAutoNext}
>
  Auto
</button>

          <button
            type="button"
            className="rundown-next-button"
            onClick={() => nextItem()}
          >
            Next
          </button>

          <button
            type="button"
            className="rundown-skip-button"
            onClick={() =>
              console.warn(
                "[Rundown] Skip logic not wired yet — requires engine hook"
              )
            }
          >
            Skip
          </button>
        </div>
      </div>

      {/* Live "NOW" strip */}
      <div className="rundown-live-strip">
        <div className="rundown-live-main">
          <span className="rundown-live-label">NOW</span>
          <span className="rundown-live-title">
            {currentItem ? currentItem.title : "No active item"}
          </span>
        </div>

        <div className="rundown-live-meta">
          <span className="pill pill-type">
            {(currentItem?.type || "segment").toUpperCase()}
          </span>

          {currentDuration != null && (
            <span className="pill">Target {formatTime(currentDuration)}</span>
          )}

          <span className="pill pill-live">
            Elapsed {formatTime(currentElapsed)}
          </span>

          <span className="pill">Scene role: {currentSceneRole || "—"}</span>
        </div>

        {/* LIVE PROGRESS BAR */}
        {currentDuration != null && (
          <div className="rundown-live-progress">
            <div
              className="rundown-live-progress-fill"
              style={{ width: `${currentProgressPct}%` }}
            />
          </div>
        )}

        <div className="rundown-live-actions">
          <button
            className="pro-button live end-segment-button"
            type="button"
            onClick={() => {
              console.warn("[Rundown] End Segment not yet wired to engine");
            }}
          >
            END SEGMENT
          </button>
        </div>
      </div>

      {/* Groups / items */}
      <div className="rundown-groups">
        {uiGroups.map(group => {
          const isSelected = group.id === selectedGroupId;

          return (
            <div
              key={group.id}
              className={
                "rundown-group" +
                (isSelected ? " rundown-group-selected" : "")
              }
              onClick={() => setSelectedGroupId(group.id)}
            >
              <div className="rundown-group-header">
                <span className="rundown-group-title">{group.title}</span>
              </div>

              <div className="rundown-group-items">
                {(group.items || []).map(item => {
                  const status = item.status || "pending";
                  const isLocked =
                    status === "live" ||
                    status === "done" ||
                    status === "skipped";
                  const isCurrent = currentItem?.id === item.id;

                  const itemType = item.type || "segment";
                  const sceneRole = getSceneRoleFromCard(item);

                  // Remaining time for LIVE item; static planned time for others
                  const hasDuration =
  typeof item.duration === "number" && item.duration > 0;

let durationLabel = null;
let progressPct = 0;
let remainingPct = 100;
let isOverrun = false;

if (hasDuration) {
  if (isCurrent && typeof currentItem?.elapsed === "number") {
    const elapsed = currentItem.elapsed;

    if (elapsed <= item.duration) {
      // Normal countdown phase
      const remaining = Math.max(0, item.duration - elapsed);
      durationLabel = `Rem ${formatTime(remaining)}`;
      remainingPct = (remaining / item.duration) * 100;

      progressPct = Math.max(
        0,
        Math.min(100, (elapsed / item.duration) * 100)
      );
    } else {
      // OVERRUN: elapsed > duration
      isOverrun = true;
      const over = elapsed - item.duration;
      durationLabel = `+${formatTime(over)}`; // show overrunning time
      remainingPct = 0;
      progressPct = 100; // bar stays full
    }
  } else {
    // Non-current items: show static planned duration
    durationLabel = formatTime(item.duration);
    remainingPct = 100;

    if (status === "done" || status === "skipped") {
      progressPct = 100;
    }
  }
}



                  return (
  <div
    key={item.id}
    ref={isCurrent ? currentItemRef : null}
    className={
      "rundown-item status-" +
      status +
      (isCurrent ? " rundown-item-current" : "") +
      " rundown-item-type-" +
      itemType
    }
    onClick={e => {
      e.stopPropagation();
      // Manual jump – engine will handle statuses/timers
      selectItem(item.id);
    }}
  >


                      {/* ITEM PROGRESS BAR */}
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
                          Role: {sceneRole || "—"}
                        </span>

                        {durationLabel && (
  <span
    className={
      "pill rundown-remaining-pill " +
      (hasDuration
        ? isOverrun
          ? "remaining-overrun"
          : remainingPct > 20
          ? "remaining-green"
          : remainingPct > 5
          ? "remaining-yellow"
          : "remaining-red"
        : "") +
      (!isOverrun && remainingPct <= 2 ? " remaining-critical-flash" : "")
    }
  >
    {durationLabel}
  </span>
)}



                        <span className="rundown-item-status">
                          {status.toUpperCase()}
                        </span>

                        {/* Inline edit/delete disabled for now */}
                        {!isLocked && false && (
                          <>
                            <button
                              type="button"
                              className="rundown-item-edit"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rundown-item-delete"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Quick Add – UI kept, behaviour not wired to engine yet */}
      <form
        className="rundown-footer"
        onSubmit={e => {
          e.preventDefault();
          console.warn(
            "[Rundown] Quick Add not yet wired to engine; use the rundown editor instead."
          );
        }}
      >
        {/* Quick-add row – visually hidden by CSS if you only want mapping */}
        <div className="rundown-quickadd">
          <button
            type="button"
            className="pill pill-type rundown-quickadd-chip"
          >
            Segment ▾
          </button>

          <button type="button" className="pill rundown-quickadd-chip">
            No duration ▾
          </button>

          <button type="button" className="pill rundown-quickadd-chip">
            Scene: None ▾
          </button>

          <input
            className="rundown-quickadd-input"
            placeholder="Rundown editing is now handled in the editor overlay."
            value=""
            readOnly
          />

          <button type="submit" className="pro-button">
            Add
          </button>
        </div>

        {/* Routing indicators row – just card types for now */}
        <div className="rundown-routing-row">
          <div className="routing-types-row">
            {typeOrder.map(t => (
              <span
                key={t}
                className="pill routing-pill routing-pill-unmapped"
              >
                {typeLabel(t).toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Footer actions – can be styled/hidden via CSS */}
        <div className="rundown-footer-actions">
          <button
            type="button"
            className="pro-button"
            onClick={() =>
              console.warn(
                "[Rundown] + Add group is disabled here – use the rundown editor."
              )
            }
          >
            + Add group
          </button>
          <button type="button" className="pro-button">
            Templates ▾
          </button>
        </div>
      </form>
    </div>
  );
}
