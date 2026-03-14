// src/components/PreviewMonitor.jsx
import React, { useEffect, useRef, useState } from "react";

export default function PreviewMonitor() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [camState, setCamState] = useState("idle"); // 'idle' | 'connecting' | 'live' | 'error'
  const [errorMsg, setErrorMsg] = useState("");

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState(null);

  const [videoInfo, setVideoInfo] = useState({ width: 0, height: 0 });

  // 1) Discover video devices on mount
  useEffect(() => {
    async function loadDevices() {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter(d => d.kind === "videoinput");

        console.log("[PreviewMonitor] Found video devices:");
        console.table(
          videoInputs.map((d, idx) => ({
            index: idx,
            deviceId: d.deviceId,
            label: d.label,
          }))
        );

        setDevices(videoInputs);

        const storedId = window.localStorage.getItem(
          "scraplet_preview_deviceId"
        );

        if (storedId && videoInputs.some(d => d.deviceId === storedId)) {
          setSelectedDeviceId(storedId);
        } else {
          // try to pick an OBS-ish camera, otherwise first
          const obsLike =
            videoInputs.find(d =>
              (d.label || "").toLowerCase().includes("obs virtual")
            ) ||
            videoInputs.find(d =>
              (d.label || "").toLowerCase().includes("obs-camera")
            ) ||
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
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 2) Auto-connect when we get a selected device and we're idle
  useEffect(() => {
    if (camState === "idle" && selectedDeviceId) {
      connectCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  // 3) Attach stream to <video> when live
  useEffect(() => {
    if (camState !== "live") return;

    const v = videoRef.current;
    const stream = streamRef.current;

    if (!v || !stream) return;

    console.log("[PreviewMonitor] Attaching stream to video element (preview)");

    v.srcObject = stream;

    const handleMetadata = () => {
      setVideoInfo({
        width: v.videoWidth,
        height: v.videoHeight,
      });
      v.play().catch(err =>
        console.error("[PreviewMonitor] play() error:", err)
      );
    };

    v.addEventListener("loadedmetadata", handleMetadata);

    return () => {
      v.removeEventListener("loadedmetadata", handleMetadata);
    };
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
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const dev = devices.find(d => d.deviceId === selectedDeviceId);
      console.log(
        "[PreviewMonitor] Connecting to device:",
        selectedDeviceId,
        dev ? dev.label : "(unknown)"
      );

      const constraints = {
        video: { deviceId: { exact: selectedDeviceId } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        console.log(
          "[PreviewMonitor] Got track from device:",
          track.label,
          track.getSettings()
        );
      }

      const label = dev ? dev.label : "Unknown device";
      setDeviceLabel(label);

      window.localStorage.setItem(
        "scraplet_preview_deviceId",
        selectedDeviceId
      );

      setCamState("live");
    } catch (err) {
      console.error("[PreviewMonitor] camera error:", err);
      setErrorMsg(err.message || "Failed to access selected video device.");
      setCamState("error");
    }
  }

  function retry() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setErrorMsg("");
    setCamState("idle");
    setVideoInfo({ width: 0, height: 0 });
  }

  const showConnectUI = camState !== "live";

  return (
    <div className="pc-panel-body preview-monitor">
      <div className="monitor-label monitor-label-preview">PREVIEW</div>

      {devices.length > 0 && (
        <div className="preview-monitor-device-selector">
          <label className="preview-monitor-device-label">
            Source:
            <select
              value={selectedDeviceId || ""}
              onChange={e => setSelectedDeviceId(e.target.value)}
            >
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "(Unnamed video device)"}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {showConnectUI && (
        <div className="preview-monitor-idle">
          <button
            className="pro-button small"
            onClick={camState === "connecting" ? undefined : connectCamera}
          >
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="preview-monitor-video"
            />
          </div>
          <div className="preview-monitor-source">
            {deviceLabel || "Unknown device"} · {videoInfo.width}×
            {videoInfo.height}
          </div>
        </>
      )}
    </div>
  );
}
