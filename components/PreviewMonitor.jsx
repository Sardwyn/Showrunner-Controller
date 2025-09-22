import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function PreviewMonitor() {
  const videoRef = useRef();

  useEffect(() => {
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource("http://localhost:8080/hls/preview.m3u8");
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = "http://localhost:8080/hls/preview.m3u8";
    }
  }, []);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      className="rounded border border-gray-400 w-full"
    />
  );
}
