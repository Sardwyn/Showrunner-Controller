import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const cameraPresets = [
  { id: "cam1", label: "Host Wide" },
  { id: "cam2", label: "Guest Close" },
  { id: "cam3", label: "Overhead" },
  { id: "cam4", label: "Side Angle" },
  { id: "cam5", label: "Audience View" },
  { id: "cam6", label: "Band Cam" },
  { id: "cam7", label: "Studio Wide" },
  { id: "cam8", label: "Desk Close" },
  { id: "cam9", label: "Custom" },
];

export default function CameraSwitcher({ onOverride }) {
  const [activeCamera, setActiveCamera] = useState("cam1");

  const handleClick = (cam) => {
    setActiveCamera(cam.id);
  };

  const handleDoubleClick = (cam) => {
    if (onOverride) {
      onOverride(cam.label); // assuming label matches scene name in OBS
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-white rounded-xl shadow">
      {cameraPresets.map((cam) => (
        <Button
          key={cam.id}
          onClick={() => handleClick(cam)}
          onDoubleClick={() => handleDoubleClick(cam)}
          className={`relative h-16 ${
            activeCamera === cam.id ? "bg-green-100 border-2 border-green-500" : ""
          }`}
        >
          {activeCamera === cam.id && (
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 rounded-t-md animate-pulse" />
          )}
          {cam.label}
        </Button>
      ))}
    </div>
  );
}
