import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createOverlayRuntimePacketV1 } from "@scraplet/contracts/overlayRuntime";
import { sendComponentPacket } from "../runtime/sendComponentPacket";

function resolveDashboardUrl(path) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `https://scraplet.store${path}`;
  }
  return path;
}

function buildComponentPacket({ overlay, component, type, payload }) {
  return createOverlayRuntimePacketV1({
    header: {
      id: `previewop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      ts: Date.now(),
      producer: "studio-controller",
      platform: "internal",
      scope: {
        tenantId: overlay.tenantId,
        overlayPublicId: overlay.publicId,
        componentInstanceId: component.instanceId,
      },
    },
    payload,
  });
}

function componentKind(component) {
  const runtimeKind = String(component?.metadata?.runtimeKind || "");
  if (runtimeKind === "lowerThird") return "Lower Third";
  if (runtimeKind) return runtimeKind;
  return "Component";
}

function componentActions(component) {
  if (Array.isArray(component?.quickActions) && component.quickActions.length) {
    return component.quickActions;
  }
  if (component?.metadata?.runtimeKind === "lowerThird") {
    return [
      { id: "show", label: "Show" },
      { id: "hide", label: "Hide" },
    ];
  }
  return [];
}

export default function PreviewMonitor() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [camState, setCamState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState(null);
  const [videoInfo, setVideoInfo] = useState({ width: 0, height: 0 });

  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(() => window.localStorage.getItem("scraplet_overlay_operator_overlayId") || "");
  const [overlayData, setOverlayData] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [draftProps, setDraftProps] = useState({});
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [overlayError, setOverlayError] = useState("");
  const [overlayStatus, setOverlayStatus] = useState("");
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    async function loadDevices() {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter((d) => d.kind === "videoinput");

        setDevices(videoInputs);

        const storedId = window.localStorage.getItem("scraplet_preview_deviceId");

        if (storedId && videoInputs.some((d) => d.deviceId === storedId)) {
          setSelectedDeviceId(storedId);
        } else {
          const obsLike =
            videoInputs.find((d) => (d.label || "").toLowerCase().includes("obs virtual")) ||
            videoInputs.find((d) => (d.label || "").toLowerCase().includes("obs-camera")) ||
            videoInputs[0];

          if (obsLike) {
            setSelectedDeviceId(obsLike.deviceId);
          }
        }
      } catch (err) {
        console.error("[PreviewMonitor] enumerateDevices error:", err);
        setErrorMsg("Unable to list video devices");
        setCamState("error");
      }
    }

    loadDevices();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (camState === "idle" && selectedDeviceId) {
      connectCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  useEffect(() => {
    if (camState !== "live") return;

    const v = videoRef.current;
    const stream = streamRef.current;

    if (!v || !stream) return;

    v.srcObject = stream;

    const handleMetadata = () => {
      setVideoInfo({
        width: v.videoWidth,
        height: v.videoHeight,
      });
      v.play().catch((err) => console.error("[PreviewMonitor] play() error:", err));
    };

    v.addEventListener("loadedmetadata", handleMetadata);

    return () => {
      v.removeEventListener("loadedmetadata", handleMetadata);
    };
  }, [camState]);

  const loadOverlays = useCallback(async () => {
    const res = await fetch(resolveDashboardUrl("/dashboard/api/controller/overlays"), {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load overlays (${res.status})`);
    const data = await res.json();
    const next = Array.isArray(data?.overlays) ? data.overlays : [];
    setOverlays(next);
    setSelectedOverlayId((current) => {
      if (current && next.some((overlay) => String(overlay.id) === current)) return current;
      return next[0]?.id != null ? String(next[0].id) : "";
    });
  }, []);

  const loadOverlayComponents = useCallback(async (overlayId) => {
    if (!overlayId) {
      setOverlayData(null);
      setSelectedComponentId("");
      return;
    }
    const res = await fetch(resolveDashboardUrl(`/dashboard/api/controller/overlays/${encodeURIComponent(overlayId)}/components`), {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load exposed components (${res.status})`);
    const data = await res.json();
    const components = Array.isArray(data?.components) ? data.components : [];
    setOverlayData(data);
    const preferred =
      components.find((component) => component?.metadata?.runtimeKind === "lowerThird")?.instanceId ||
      components[0]?.instanceId ||
      "";
    setSelectedComponentId((current) =>
      current && components.some((component) => component.instanceId === current) ? current : preferred
    );
  }, []);

  useEffect(() => {
    let alive = true;
    setOverlayLoading(true);
    setOverlayError("");
    loadOverlays()
      .catch((err) => {
        if (!alive) return;
        setOverlayError(err?.message || "Failed to load overlays");
      })
      .finally(() => {
        if (alive) setOverlayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadOverlays]);

  useEffect(() => {
    if (!selectedOverlayId) {
      setOverlayData(null);
      return;
    }
    window.localStorage.setItem("scraplet_overlay_operator_overlayId", selectedOverlayId);
    let alive = true;
    setOverlayLoading(true);
    setOverlayError("");
    loadOverlayComponents(selectedOverlayId)
      .catch((err) => {
        if (!alive) return;
        setOverlayError(err?.message || "Failed to load exposed components");
        setOverlayData(null);
      })
      .finally(() => {
        if (alive) setOverlayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedOverlayId, loadOverlayComponents]);

  const selectedComponent = useMemo(
    () => overlayData?.components?.find((component) => component.instanceId === selectedComponentId) || null,
    [overlayData, selectedComponentId]
  );

  useEffect(() => {
    if (!selectedComponent) {
      setDraftProps({});
      return;
    }
    const next = {};
    for (const key of selectedComponent.editableProps || []) {
      next[key] = selectedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(next);
  }, [selectedComponent]);

  const quickActions = useMemo(() => componentActions(selectedComponent), [selectedComponent]);

  const draftDirty = useMemo(() => {
    if (!selectedComponent) return false;
    return (selectedComponent.editableProps || []).some((key) => {
      const currentValue = selectedComponent.propValues?.[key] ?? "";
      return String(draftProps[key] ?? "") !== String(currentValue ?? "");
    });
  }, [draftProps, selectedComponent]);

  async function connectCamera() {
    if (!selectedDeviceId) {
      setErrorMsg("No video device selected.");
      setCamState("error");
      return;
    }

    try {
      setCamState("connecting");
      setErrorMsg("");
      setVideoInfo({ width: 0, height: 0 });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const dev = devices.find((d) => d.deviceId === selectedDeviceId);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } },
      });
      streamRef.current = stream;

      setDeviceLabel(dev ? dev.label : "Unknown device");
      window.localStorage.setItem("scraplet_preview_deviceId", selectedDeviceId);
      setCamState("live");
    } catch (err) {
      console.error("[PreviewMonitor] camera error:", err);
      setErrorMsg(err.message || "Failed to access selected video device.");
      setCamState("error");
    }
  }

  function retry() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setErrorMsg("");
    setCamState("idle");
    setVideoInfo({ width: 0, height: 0 });
  }

  async function refreshOverlayControls() {
    try {
      setOverlayLoading(true);
      setOverlayError("");
      await loadOverlays();
      if (selectedOverlayId) {
        await loadOverlayComponents(selectedOverlayId);
      }
      setOverlayStatus("Refreshed");
      window.setTimeout(() => setOverlayStatus(""), 1200);
    } catch (err) {
      setOverlayError(err?.message || "Failed to refresh overlay controls");
    } finally {
      setOverlayLoading(false);
    }
  }

  async function runQuickAction(action) {
    if (!overlayData?.overlay || !selectedComponent) return;
    try {
      setOverlayStatus(`${action.label}…`);
      const type =
        action.id === "show"
          ? "component.show"
          : action.id === "hide"
            ? "component.hide"
            : "component.dispatch";
      const payload = action.id === "dispatch" ? { event: action.event || action.label, data: {} } : {};
      const packet = buildComponentPacket({
        overlay: overlayData.overlay,
        component: selectedComponent,
        type,
        payload,
      });
      await sendComponentPacket(packet);
      setOverlayStatus(`${action.label} sent`);
      window.setTimeout(() => setOverlayStatus(""), 1400);
    } catch (err) {
      setOverlayError(err?.message || `Failed to ${action.label.toLowerCase()}`);
    }
  }

  async function applyProps() {
    if (!overlayData?.overlay || !selectedComponent) return;
    try {
      setOverlayStatus("Updating…");
      const packet = buildComponentPacket({
        overlay: overlayData.overlay,
        component: selectedComponent,
        type: "component.setProp",
        payload: { patch: draftProps },
      });
      await sendComponentPacket(packet);
      setOverlayData((current) => {
        if (!current) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.instanceId === selectedComponent.instanceId
              ? {
                  ...component,
                  propValues: {
                    ...component.propValues,
                    ...draftProps,
                  },
                }
              : component
          ),
        };
      });
      setOverlayStatus("Updated");
      window.setTimeout(() => setOverlayStatus(""), 1400);
    } catch (err) {
      setOverlayError(err?.message || "Failed to update component props");
    }
  }

  const showConnectUI = camState !== "live";

  return (
    <div className="pc-panel-body preview-monitor">
      <div className="monitor-label monitor-label-preview">PREVIEW</div>

      <div className="preview-monitor-toolbar">
        {devices.length > 0 && (
          <div className="preview-monitor-device-selector">
            <label className="preview-monitor-device-label">
              Source:
              <select value={selectedDeviceId || ""} onChange={(e) => setSelectedDeviceId(e.target.value)}>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || "(Unnamed video device)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="preview-monitor-overlay-controls">
          <label className="preview-monitor-device-label">
            Overlay:
            <select value={selectedOverlayId || ""} onChange={(e) => setSelectedOverlayId(e.target.value)}>
              <option value="">Select overlay</option>
              {overlays.map((overlay) => (
                <option key={overlay.id} value={overlay.id}>
                  {overlay.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="preview-monitor-refresh" onClick={refreshOverlayControls}>
            Refresh
          </button>
        </div>
      </div>

      {showConnectUI && (
        <div className="preview-monitor-idle">
          <button className="pro-button small" onClick={camState === "connecting" ? undefined : connectCamera}>
            {camState === "connecting" ? "Connecting…" : "Connect Preview"}
          </button>
          {camState === "error" && (
            <>
              <p className="preview-monitor-error-text">{errorMsg}</p>
              <button className="pro-button tiny" onClick={retry}>
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {camState === "live" && (
        <>
          <div className="preview-monitor-video-frame">
            <video ref={videoRef} autoPlay playsInline muted className="preview-monitor-video" />

            {overlayData?.overlay &&
              overlayData.components?.map((component) => {
                const bounds = component.bounds;
                const left = `${(bounds.x / overlayData.overlay.baseResolution.width) * 100}%`;
                const top = `${(bounds.y / overlayData.overlay.baseResolution.height) * 100}%`;
                const width = `${(bounds.width / overlayData.overlay.baseResolution.width) * 100}%`;
                const height = `${(bounds.height / overlayData.overlay.baseResolution.height) * 100}%`;
                return (
                  <button
                    key={component.instanceId}
                    type="button"
                    className={`preview-monitor-hotspot ${selectedComponentId === component.instanceId ? "is-selected" : ""}`}
                    style={{ left, top, width, height }}
                    onClick={() => {
                      setSelectedComponentId(component.instanceId);
                      setControlsOpen(true);
                    }}
                    title={component.label}
                  >
                    <span>{component.label}</span>
                  </button>
                );
              })}

            {selectedComponent && (
              <div className={`preview-monitor-component-card ${controlsOpen ? "is-open" : ""}`}>
                <div className="preview-monitor-component-header">
                  <div>
                    <div className="preview-monitor-component-label">{selectedComponent.label}</div>
                    <div className="preview-monitor-component-meta">{componentKind(selectedComponent)}</div>
                  </div>
                  <button
                    type="button"
                    className="preview-monitor-card-toggle"
                    onClick={() => setControlsOpen((open) => !open)}
                  >
                    {controlsOpen ? "Hide" : "Show"}
                  </button>
                </div>

                {controlsOpen && (
                  <>
                    {overlayError ? <div className="preview-monitor-component-error">{overlayError}</div> : null}
                    {overlayStatus ? <div className="preview-monitor-component-status">{overlayStatus}</div> : null}

                    {quickActions.length ? (
                      <div className="preview-monitor-component-actions">
                        {quickActions.map((action) => (
                          <button
                            key={`${action.id}_${action.event || ""}`}
                            type="button"
                            className="preview-monitor-component-button"
                            onClick={() => runQuickAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {(selectedComponent.editableProps || []).map((key) => {
                      const schema = selectedComponent.propsSchema?.[key];
                      const type = schema?.type || "text";
                      return (
                        <label key={key} className="preview-monitor-component-field">
                          <span>{schema?.label || key}</span>
                          {type === "color" ? (
                            <input
                              type="color"
                              value={String(draftProps[key] || "#ffffff")}
                              onChange={(e) => setDraftProps((current) => ({ ...current, [key]: e.target.value }))}
                            />
                          ) : (
                            <input
                              type="text"
                              value={draftProps[key] ?? ""}
                              onChange={(e) => setDraftProps((current) => ({ ...current, [key]: e.target.value }))}
                            />
                          )}
                        </label>
                      );
                    })}

                    {(selectedComponent.editableProps || []).length ? (
                      <div className="preview-monitor-component-actions">
                        <button
                          type="button"
                          className="preview-monitor-component-button is-secondary"
                          onClick={() => {
                            const next = {};
                            for (const key of selectedComponent.editableProps || []) {
                              next[key] = selectedComponent.propValues?.[key] ?? "";
                            }
                            setDraftProps(next);
                          }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="preview-monitor-component-button"
                          disabled={!draftDirty}
                          onClick={applyProps}
                        >
                          {draftDirty ? "Apply Update" : "Up to Date"}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="preview-monitor-source">
            {deviceLabel || "Unknown device"} · {videoInfo.width}×{videoInfo.height}
            {selectedComponent ? ` · ${selectedComponent.label}` : ""}
          </div>
        </>
      )}
    </div>
  );
}
