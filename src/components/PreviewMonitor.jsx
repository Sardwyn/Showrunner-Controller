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

function resolveQuickActions(component) {
  if (Array.isArray(component?.quickActions) && component.quickActions.length) return component.quickActions;
  if (component?.metadata?.runtimeKind === "lowerThird") {
    return [
      { id: "show", label: "Show" },
      { id: "hide", label: "Hide" },
    ];
  }
  return [];
}

function componentKindLabel(component) {
  const runtimeKind = String(component?.metadata?.runtimeKind || "");
  if (runtimeKind === "lowerThird") return "Lower Third";
  if (runtimeKind) return runtimeKind;
  return "Component";
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
  const [focusedComponentId, setFocusedComponentId] = useState("");
  const [hoveredComponentId, setHoveredComponentId] = useState("");
  const [draftProps, setDraftProps] = useState({});
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [overlayError, setOverlayError] = useState("");
  const [overlayStatus, setOverlayStatus] = useState("");

  useEffect(() => {
    async function loadDevices() {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);

        const storedId = window.localStorage.getItem("scraplet_preview_deviceId");
        if (storedId && videoInputs.some((d) => d.deviceId === storedId)) {
          setSelectedDeviceId(storedId);
          return;
        }

        const obsLike =
          videoInputs.find((d) => (d.label || "").toLowerCase().includes("obs virtual")) ||
          videoInputs.find((d) => (d.label || "").toLowerCase().includes("obs-camera")) ||
          videoInputs[0];
        if (obsLike) setSelectedDeviceId(obsLike.deviceId);
      } catch (err) {
        console.error("[PreviewMonitor] enumerateDevices error:", err);
        setErrorMsg("Unable to list video devices");
        setCamState("error");
      }
    }

    loadDevices();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (camState === "idle" && selectedDeviceId) connectCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  useEffect(() => {
    if (camState !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    const handleMetadata = () => {
      setVideoInfo({ width: video.videoWidth, height: video.videoHeight });
      video.play().catch((err) => console.error("[PreviewMonitor] play() error:", err));
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    return () => video.removeEventListener("loadedmetadata", handleMetadata);
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
      setFocusedComponentId("");
      return;
    }
    const res = await fetch(resolveDashboardUrl(`/dashboard/api/controller/overlays/${encodeURIComponent(overlayId)}/components`), {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load exposed components (${res.status})`);
    const data = await res.json();
    const components = Array.isArray(data?.components) ? data.components : [];
    setOverlayData(data);
    setFocusedComponentId((current) =>
      current && components.some((component) => component.instanceId === current) ? current : ""
    );
  }, []);

  useEffect(() => {
    let alive = true;
    setOverlayLoading(true);
    setOverlayError("");
    loadOverlays()
      .catch((err) => {
        if (alive) setOverlayError(err?.message || "Failed to load overlays");
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

  const focusedComponent = useMemo(
    () => overlayData?.components?.find((component) => component.instanceId === focusedComponentId) || null,
    [overlayData, focusedComponentId]
  );

  useEffect(() => {
    if (!focusedComponent) {
      setDraftProps({});
      return;
    }
    const next = {};
    for (const key of focusedComponent.editableProps || []) {
      next[key] = focusedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(next);
  }, [focusedComponent]);

  const quickActions = useMemo(() => resolveQuickActions(focusedComponent), [focusedComponent]);
  const lowerThirdMode = focusedComponent?.metadata?.runtimeKind === "lowerThird";

  const draftDirty = useMemo(() => {
    if (!focusedComponent) return false;
    return (focusedComponent.editableProps || []).some((key) => {
      const current = focusedComponent.propValues?.[key] ?? "";
      return String(draftProps[key] ?? "") !== String(current);
    });
  }, [draftProps, focusedComponent]);

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

      const device = devices.find((d) => d.deviceId === selectedDeviceId);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } },
      });
      streamRef.current = stream;
      setDeviceLabel(device ? device.label : "Unknown device");
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
      if (selectedOverlayId) await loadOverlayComponents(selectedOverlayId);
      setOverlayStatus("Refreshed");
      window.setTimeout(() => setOverlayStatus(""), 1200);
    } catch (err) {
      setOverlayError(err?.message || "Failed to refresh overlay controls");
    } finally {
      setOverlayLoading(false);
    }
  }

  async function runQuickAction(action) {
    if (!overlayData?.overlay || !focusedComponent) return;
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
        component: focusedComponent,
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

  async function takeLowerThird() {
    if (!overlayData?.overlay || !focusedComponent) return;
    try {
      setOverlayStatus("Taking…");
      const setPropsPacket = buildComponentPacket({
        overlay: overlayData.overlay,
        component: focusedComponent,
        type: "component.setProp",
        payload: { patch: draftProps },
      });
      await sendComponentPacket(setPropsPacket);

      const showPacket = buildComponentPacket({
        overlay: overlayData.overlay,
        component: focusedComponent,
        type: "component.show",
        payload: {},
      });
      await sendComponentPacket(showPacket);

      setOverlayData((current) => {
        if (!current) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.instanceId === focusedComponent.instanceId
              ? { ...component, propValues: { ...component.propValues, ...draftProps } }
              : component
          ),
        };
      });
      setOverlayStatus("On air");
      window.setTimeout(() => setOverlayStatus(""), 1400);
    } catch (err) {
      setOverlayError(err?.message || "Failed to take lower third");
    }
  }

  async function clearLowerThird() {
    if (!overlayData?.overlay || !focusedComponent) return;
    try {
      setOverlayStatus("Clearing…");
      const hidePacket = buildComponentPacket({
        overlay: overlayData.overlay,
        component: focusedComponent,
        type: "component.hide",
        payload: {},
      });
      await sendComponentPacket(hidePacket);
      setOverlayStatus("Cleared");
      window.setTimeout(() => setOverlayStatus(""), 1400);
    } catch (err) {
      setOverlayError(err?.message || "Failed to clear lower third");
    }
  }

  function resetDraftProps() {
    if (!focusedComponent) return;
    const next = {};
    for (const key of focusedComponent.editableProps || []) {
      next[key] = focusedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(next);
  }

  const showConnectUI = camState !== "live";

  return (
    <div className="pc-panel-body preview-monitor">
      <div className="monitor-label monitor-label-preview">Preview</div>

      <div className="preview-monitor-toolbar">
        {devices.length > 0 && (
          <label className="preview-monitor-device-label">
            Source:
            <select value={selectedDeviceId || ""} onChange={(e) => setSelectedDeviceId(e.target.value)}>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "(Unnamed video device)"}
                </option>
              ))}
            </select>
          </label>
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
                const hovered = hoveredComponentId === component.instanceId;
                const focused = focusedComponentId === component.instanceId;
                return (
                  <button
                    key={component.instanceId}
                    type="button"
                    className={`preview-monitor-hotspot ${hovered ? "is-hovered" : ""} ${focused ? "is-focused" : ""}`}
                    style={{ left, top, width, height }}
                    onMouseEnter={() => setHoveredComponentId(component.instanceId)}
                    onMouseLeave={() => setHoveredComponentId((current) => (current === component.instanceId ? "" : current))}
                    onFocus={() => setHoveredComponentId(component.instanceId)}
                    onBlur={() => setHoveredComponentId((current) => (current === component.instanceId ? "" : current))}
                    onClick={() => setFocusedComponentId(component.instanceId)}
                    title={component.label}
                  >
                    {(hovered || focused) && <span>{component.label}</span>}
                  </button>
                );
              })}
          </div>

          <div className="preview-monitor-footer">
            <div className="preview-monitor-source">
              {deviceLabel || "Unknown device"} · {videoInfo.width}×{videoInfo.height}
              {overlayLoading ? " · Loading components…" : ""}
              {overlayStatus ? ` · ${overlayStatus}` : ""}
            </div>

            {overlayData?.components?.length ? (
              <div className="preview-monitor-component-strip">
                {overlayData.components.map((component) => (
                  <button
                    key={component.instanceId}
                    type="button"
                    className={`preview-monitor-component-chip ${focusedComponentId === component.instanceId ? "is-selected" : ""}`}
                    onClick={() => setFocusedComponentId(component.instanceId)}
                  >
                    <span className="preview-monitor-component-chip-label">{component.label}</span>
                    <span className="preview-monitor-component-chip-kind">{componentKindLabel(component)}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {focusedComponent ? (
              <div className="preview-monitor-drawer">
                <div className="preview-monitor-drawer-header">
                  <div>
                    <div className="preview-monitor-component-label">{focusedComponent.label}</div>
                    <div className="preview-monitor-component-meta">{componentKindLabel(focusedComponent)}</div>
                  </div>
                  {!lowerThirdMode && (
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
                  )}
                </div>

                {overlayError ? <div className="preview-monitor-component-error">{overlayError}</div> : null}

                {lowerThirdMode ? (
                  <div className="preview-monitor-lower-third-layout">
                    <div className="preview-monitor-lower-third-live">
                      <div className="preview-monitor-lower-third-caption">On Air</div>
                      <div className="preview-monitor-lower-third-live-title">{focusedComponent.propValues?.title || "No name on air"}</div>
                      <div className="preview-monitor-lower-third-live-subtitle">{focusedComponent.propValues?.subtitle || "No title on air"}</div>
                    </div>

                    <div className="preview-monitor-lower-third-next">
                      <div className="preview-monitor-lower-third-caption">Next</div>
                      <div className="preview-monitor-lower-third-fields">
                        <label className="preview-monitor-component-field">
                          <span>Guest Name</span>
                          <input
                            type="text"
                            value={draftProps.title ?? ""}
                            onChange={(e) => setDraftProps((current) => ({ ...current, title: e.target.value }))}
                          />
                        </label>
                        <label className="preview-monitor-component-field">
                          <span>Guest Title</span>
                          <input
                            type="text"
                            value={draftProps.subtitle ?? ""}
                            onChange={(e) => setDraftProps((current) => ({ ...current, subtitle: e.target.value }))}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="preview-monitor-lower-third-actions">
                      <button type="button" className="preview-monitor-component-button is-secondary" onClick={resetDraftProps}>
                        Reset
                      </button>
                      <button type="button" className="preview-monitor-component-button" onClick={clearLowerThird}>
                        Clear
                      </button>
                      <button type="button" className="preview-monitor-component-button is-take" disabled={!draftDirty} onClick={takeLowerThird}>
                        {draftDirty ? "Take" : "Take Current"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="preview-monitor-generic-layout">
                    <div className="preview-monitor-generic-grid">
                      {(focusedComponent.editableProps || []).map((key) => {
                        const schema = focusedComponent.propsSchema?.[key];
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
                    </div>
                    <div className="preview-monitor-component-actions preview-monitor-component-actions--footer">
                      <button type="button" className="preview-monitor-component-button is-secondary" onClick={resetDraftProps}>
                        Reset
                      </button>
                      <button type="button" className="preview-monitor-component-button" disabled={!draftDirty} onClick={applyProps}>
                        {draftDirty ? "Apply Update" : "Up to Date"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="preview-monitor-empty-state">
                {overlayData?.components?.length
                  ? "Hover a component in preview or choose one from the strip below."
                  : "This overlay has no controller-exposed components yet."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
