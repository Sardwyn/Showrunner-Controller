import React from "react";
import PreviewMonitor from "./PreviewMonitor";


export default function VideoMonitor({ type, aspectRatio }) {
  return (
    <div className="w-full h-full bg-black text-white flex items-center justify-center border border-gray-600">
      <span className="text-sm uppercase">{type} Monitor ({aspectRatio})</span>
    </div>
  );
}