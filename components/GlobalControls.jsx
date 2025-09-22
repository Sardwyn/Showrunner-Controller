import React, { useState } from "react";
import StudioButton from "./StudioButton";
import { sendToOBS } from "../utils/obsClient";

const adBreakScenes = ["Ad Break 1", "Ad Break 2", "Ad Break 3", "Ad Break 4"];
const miscControls = ["Logo Screen", "Stream End"];

export default function GlobalControls() {
    const [lastPlayedIndex, setLastPlayedIndex] = useState(null);
    const [lastPlayedMisc, setLastPlayedMisc] = useState(null);

    const handleAdScene = async (index) => {
        const sceneName = adBreakScenes[index];
        try {
            await sendToOBS("SetCurrentProgramScene", { sceneName });
            setLastPlayedIndex(index);
        } catch (err) {
            alert(`Scene "${sceneName}" not found in OBS.`);
        }
    };

    const handleMiscScene = async (sceneName) => {
        try {
            await sendToOBS("SetCurrentProgramScene", { sceneName });
            setLastPlayedMisc(sceneName);
        } catch (err) {
            alert(`Scene "${sceneName}" not found in OBS.`);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                {adBreakScenes.map((label, idx) => (
                    <StudioButton
                        key={label}
                        label={label.replace("Ad Break ", "Ad ")}
                        onClick={() => handleAdScene(idx)}
                        color={lastPlayedIndex === idx ? "green" : "blue"}
                        isActive={lastPlayedIndex === idx}
                    />
                ))}
            </div>
            <div className="flex gap-2">
                {miscControls.map((ctrl) => (
                    <StudioButton
                        key={ctrl}
                        label={ctrl}
                        onClick={() => handleMiscScene(ctrl)}
                        color={ctrl === "Emergency Cut" ? "red" : "blue"}
                        isActive={false}
                    />
                ))}
            </div>
        </div>
    );
}