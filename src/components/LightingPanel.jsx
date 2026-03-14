import React, { useState } from "react";
import StudioButton from "./StudioButton";

const lightingPresets = ["Stage", "House", "Ambient", "Blackout"];

export default function LightingPanel() {
    const [activePreset, setActivePreset] = useState(null);

    const handleLightingChange = (preset) => {
        setActivePreset(preset);
        // 🔌 Add actual lighting control logic here
        console.log("Lighting:", preset);
    };

    return (
        <div className="grid grid-cols-2 gap-2">
            {lightingPresets.map((label) => (
                <StudioButton
                    key={label}
                    label={label}
                    color="gray"
                    isActive={activePreset === label}
                    onClick={() => handleLightingChange(label)}
                />
            ))}
        </div>
    );
}
