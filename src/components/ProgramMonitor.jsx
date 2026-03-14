// src/components/ProgramMonitor.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ProgramMonitor() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 'idle' | 'connecting' | 'live' | 'error'
  const [camState, setCamState] = useState("idle");
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

        console.log("[ProgramMonitor] Found video devices:");
        console.table(
          videoInputs.map((d, idx) => ({
            index: idx,
            deviceId: d.deviceId,
            label: d.label,
          }))
        );

        setDevices(videoInputs);

        const storedId = window.localStorage.getItem(
          "scraplet_program_deviceId"
        );

        if (storedId && videoInputs.some(d => d.deviceId === storedId)) {
          setSelectedDeviceId(storedId);
        } else {
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
        console.error("[ProgramMonitor] enumerateDevices error:", err);
      }
    }

    loadDevices();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 2) Attach the current stream to the <video> when we are live
  useEffect(() => {
    if (camState !== "live") return;

    const v = videoRef.current;
    const stream = streamRef.current;
    if (!v || !stream) return;

    console.log("[ProgramMonitor] Attaching stream to video element");
    v.srcObject = stream;

    const handleMetadata = () => {
      console.log(
        "[ProgramMonitor] video metadata:",
        v.videoWidth,
        "x",
        v.videoHeight
      );
      setVideoInfo({
        width: v.videoWidth,
        height: v.videoHeight,
      });
      v.play().catch(err =>
        console.error("[ProgramMonitor] play() error:", err)
      );
    };

    v.addEventListener("loadedmetadata", handleMetadata);
    return () => v.removeEventListener("loadedmetadata", handleMetadata);
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
        "[ProgramMonitor] Connecting to device:",
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
          "[ProgramMonitor] Got track from device:",
          track.label,
          track.getSettings()
        );
      } else {
        console.warn("[ProgramMonitor] Stream has no video tracks!");
      }

      const label = dev ? dev.label : "Unknown device";
      setDeviceLabel(label);

      window.localStorage.setItem(
        "scraplet_program_deviceId",
        selectedDeviceId
      );

      setCamState("live");
    } catch (err) {
      console.error("[ProgramMonitor] camera error:", err);
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

  // 3) AUTO-CONNECT whenever we have a selected device and we're idle
  useEffect(() => {
    if (camState === "idle" && selectedDeviceId && devices.length) {
      console.log("[ProgramMonitor] Auto-connecting to stored device…");
      connectCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, devices]);

  const showConnectUI = camState !== "live";

  return (
    <div className="pc-panel-body program-monitor">
      <div className="monitor-label monitor-label-program">PROGRAM</div>

      {devices.length > 0 && (
        <div className="monitor-device-selector">
          <label className="monitor-device-label">
            Source:
            <select
              value={selectedDeviceId || ""}
              onChange={e => {
                setSelectedDeviceId(e.target.value);
                // when user changes source, go back to idle to trigger auto-connect
                setCamState("idle");
              }}
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
        <div className="program-monitor-idle">
          <button className="pro-button large" onClick={connectCamera}>
            {camState === "connecting" ? "Connecting…" : "Connect Program Feed"}
          </button>
          <p className="program-monitor-hint">
            Start OBS Virtual Camera, then pick the device that shows your OBS
            scene (often “OBS Virtual Camera” or “OBS-Camera”).
          </p>
          {camState === "error" && (
            <p className="program-monitor-error-text">
              {errorMsg}{" "}
              <button
                type="button"
                className="link-button"
                onClick={retry}
              >
                Retry
              </button>
            </p>
          )}
        </div>
      )}

      {camState === "live" && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="program-monitor-video"
          />
          <div className="program-monitor-source">
            {deviceLabel || "Unknown device"} — {videoInfo.width}×
            {videoInfo.height}
          </div>
        </>
      )}
    </div>
  );
}
