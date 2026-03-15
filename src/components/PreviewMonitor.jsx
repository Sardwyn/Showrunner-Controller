import React, { useEffect, useRef, useState } from "react";
import { useOverlayControl } from "../runtime/OverlayControlContext";

export default function PreviewMonitor() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [camState, setCamState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState(null);
  const [videoInfo, setVideoInfo] = useState({ width: 0, height: 0 });

  const {
    overlays,
    selectedOverlayId,
    setSelectedOverlayId,
    overlayData,
    focusedComponentId,
    setFocusedComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    loading,
    status,
    refresh,
  } = useOverlayControl();

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
          <button type="button" className="preview-monitor-refresh" onClick={refresh}>
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
              {loading ? " · Loading components…" : ""}
              {status ? ` · ${status}` : ""}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
