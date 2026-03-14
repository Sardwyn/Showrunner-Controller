import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRundownEngineContext } from "../rundown/runtime/RundownEngineProvider";
import "../styles/teleprompter.css";

const DEFAULT_SETTINGS = {
  speed: 40, // 0–100
  fontSize: "lg", // "sm" | "md" | "lg" | "xl"
  lineHeight: "wide", // "normal" | "wide"
};

function speedToPxPerSecond(speed) {
  return (Math.max(0, Math.min(speed, 100)) / 100) * 300;
}

function resolveScriptText(source) {
  if (!source) return "";
  if (source.kind === "inline") return source.text;
  return source.fallbackText || "";
}

function fontSizeToPx(fontSize) {
  switch (fontSize) {
    case "sm":
      return 20;
    case "md":
      return 28;
    case "lg":
      return 36;
    case "xl":
      return 46;
    default:
      return 32;
  }
}

function lineHeightToValue(lineHeight) {
  return lineHeight === "wide" ? 1.6 : 1.3;
}

export default function TeleprompterPanel() {
  const { currentItem } = useRundownEngineContext();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scriptSource, setScriptSource] = useState(
    currentItem && currentItem.script ? currentItem.script.source : undefined
  );
  const [editBuffer, setEditBuffer] = useState(() =>
    resolveScriptText(
      currentItem && currentItem.script && currentItem.script.source
    )
  );

  const contentRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const containerRef = useRef(null);

  // When the current rundown item changes, load its script
  useEffect(() => {
    if (!currentItem || !currentItem.script) {
      setScriptSource(undefined);
      setEditBuffer("");
      setIsAutoScrolling(false);
      return;
    }

    const script = currentItem.script;
    setScriptSource(script.source);

    const text = resolveScriptText(script.source);
    setEditBuffer(text);

    setSettings(prev => ({
      ...prev,
      speed: script.speedPreset != null ? script.speedPreset : prev.speed,
      fontSize: script.fontPreset || prev.fontSize,
    }));

    setIsAutoScrolling(false);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentItem]);

  const displayedText = useMemo(() => editBuffer || "", [editBuffer]);

  // Auto-scroll loop
  useEffect(() => {
    if (!isAutoScrolling) {
      lastTimestampRef.current = null;
      return;
    }

    let frameId;

    const step = ts => {
      if (!contentRef.current) {
        lastTimestampRef.current = ts;
        frameId = requestAnimationFrame(step);
        return;
      }

      if (lastTimestampRef.current != null) {
        const deltaMs = ts - lastTimestampRef.current;
        const pxPerSec = speedToPxPerSecond(settings.speed);
        const deltaPx = (pxPerSec * deltaMs) / 1000;
        contentRef.current.scrollTop += deltaPx;
      }

      lastTimestampRef.current = ts;
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frameId);
      lastTimestampRef.current = null;
    };
  }, [isAutoScrolling, settings.speed]);

  const handleToggleScroll = useCallback(() => {
    setIsAutoScrolling(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback(value => {
    const v = Math.max(0, Math.min(100, value));
    setSettings(prev => ({ ...prev, speed: v }));
  }, []);

  const handleFontSizeChange = useCallback(fontSize => {
    setSettings(prev => ({ ...prev, fontSize }));
  }, []);

  const handleLineHeightChange = useCallback(lineHeight => {
    setSettings(prev => ({ ...prev, lineHeight }));
  }, []);

  const handleBackToTop = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, []);

  const handleApplyEdits = useCallback(() => {
    if (!scriptSource) {
      setScriptSource({
        kind: "inline",
        text: editBuffer,
      });
      return;
    }

    if (scriptSource.kind === "inline") {
      setScriptSource({
        ...scriptSource,
        text: editBuffer,
      });
    } else {
      setScriptSource({
        ...scriptSource,
        fallbackText: editBuffer,
      });
    }
    // TODO: push back into rundown engine / Scrapbot when ready
  }, [editBuffer, scriptSource]);

  const handleTxtUpload = useCallback(async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      setEditBuffer(text);
      setScriptSource({
        kind: "inline",
        text,
      });
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } catch (err) {
      console.error("Failed to read .txt file:", err);
    } finally {
      event.target.value = "";
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKeyDown = e => {
      if (!el.contains(document.activeElement)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsAutoScrolling(prev => !prev);
      } else if (e.code === "ArrowUp") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSpeedChange(settings.speed - 5);
        } else if (contentRef.current) {
          contentRef.current.scrollTop -= 40;
        }
      } else if (e.code === "ArrowDown") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSpeedChange(settings.speed + 5);
        } else if (contentRef.current) {
          contentRef.current.scrollTop += 40;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settings.speed, handleSpeedChange]);

  const fontSizePx = fontSizeToPx(settings.fontSize);
  const lineHeightValue = lineHeightToValue(settings.lineHeight);

  return (
    <div className="teleprompter-panel" ref={containerRef}>
      <div className="teleprompter-header">
        <div className="teleprompter-title">
          Teleprompter
          {currentItem ? (
            <span className="teleprompter-subtitle">
              &nbsp;– {currentItem.title}
            </span>
          ) : (
            <span className="teleprompter-subtitle">&nbsp;– No item selected</span>
          )}
        </div>

        <div className="teleprompter-actions">
          <button
            type="button"
            className={
              "teleprompter-btn primary " +
              (isAutoScrolling ? "teleprompter-btn-active" : "")
            }
            onClick={handleToggleScroll}
          >
            {isAutoScrolling ? "Stop" : "Start"}
          </button>
          <button
            type="button"
            className="teleprompter-btn"
            onClick={handleBackToTop}
          >
            Top
          </button>
        </div>
      </div>

      <div className="teleprompter-body">
        {/* Compact control column */}
        <div className="teleprompter-controls">
          <div className="teleprompter-control-block">
            <div className="teleprompter-control-row">
              <span className="teleprompter-label-small">Font</span>
              <div className="teleprompter-pill-row">
                {["sm", "md", "lg", "xl"].map(size => (
                  <button
                    key={size}
                    type="button"
                    className={
                      "teleprompter-pill " +
                      (settings.fontSize === size
                        ? "teleprompter-pill-active"
                        : "")
                    }
                    onClick={() => handleFontSizeChange(size)}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="teleprompter-control-row">
              <span className="teleprompter-label-small">Spacing</span>
              <div className="teleprompter-pill-row">
                {["normal", "wide"].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    className={
                      "teleprompter-pill " +
                      (settings.lineHeight === mode
                        ? "teleprompter-pill-active"
                        : "")
                    }
                    onClick={() => handleLineHeightChange(mode)}
                  >
                    {mode === "normal" ? "Normal" : "Wide"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="teleprompter-control-block teleprompter-speed-block">
            <div className="teleprompter-control-row teleprompter-speed-header">
              <span className="teleprompter-label-small">Speed</span>
              <span className="teleprompter-speed-value">
                {settings.speed}
              </span>
            </div>

            <div className="teleprompter-speed-vertical">
              <div className="teleprompter-speed-slider-wrapper">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.speed}
                  onChange={e => handleSpeedChange(Number(e.target.value))}
                  className="teleprompter-speed-slider-vertical"
                />
              </div>
              <div className="teleprompter-speed-buttons">
                <button
                  type="button"
                  className="teleprompter-btn small"
                  onClick={() => handleSpeedChange(settings.speed - 5)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="teleprompter-btn small"
                  onClick={() => handleSpeedChange(settings.speed + 5)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main read area + load + tiny editor */}
        <div className="teleprompter-main">
          <div className="teleprompter-preview-wrapper">
            <div className="teleprompter-preview" ref={contentRef}>
              <div className="teleprompter-readline" />
              <div
                className="teleprompter-text"
                style={{
                  fontSize: fontSizePx + "px",
                  lineHeight: lineHeightValue,
                }}
              >
                {displayedText.split(/\r?\n/).map((line, idx) => (
                  <p key={idx}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="teleprompter-load-block">
            <label className="teleprompter-label">Load .txt</label>
            <input type="file" accept=".txt" onChange={handleTxtUpload} />
          </div>

          <div className="teleprompter-editor">
            <label className="teleprompter-label">Script editor</label>
            <textarea
              className="teleprompter-textarea"
              value={editBuffer}
              onChange={e => setEditBuffer(e.target.value)}
              rows={3}
            />
            <button
              type="button"
              className="teleprompter-btn"
              onClick={handleApplyEdits}
            >
              Apply changes (local)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
