import React, { useState } from "react";
import CameraSwitcher from "./CameraSwitcher";
import StudioButton from "./StudioButton";
import { sendCue } from "../utils/sendCue";

const CameraPanel = () => {
    const [selectedCamera, setSelectedCamera] = useState(null);

    const cameraPresets = [
        { id: 1, label: "Cam 1", preset: "preset1" },
        { id: 2, label: "Cam 2", preset: "preset2" },
        { id: 3, label: "Cam 3", preset: "preset3" },
        { id: 4, label: "Cam 4", preset: "preset4" },
        // etc
    ];

    const handleClick = (preset, id) => {
        console.log("Switching to", preset);
        setSelectedCamera(id);

        // Send cue to Unreal
        sendCue("camera_switch", { preset });
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {cameraPresets.map((cam) => (
                <StudioButton
                    key={cam.id}
                    label={cam.label}
                    onClick={() => handleClick(cam.preset, cam.id)}
                    color="blue"
                    isActive={selectedCamera === cam.id}
                />
            ))}
        </div>
    );
};

export default CameraPanel;
