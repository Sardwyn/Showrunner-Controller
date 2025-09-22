import React, { useEffect, useState } from "react";
import { sendToOBS } from "../utils/obsClient";
import { useOBSConnection } from "../hooks/useOBSConnection";
import StudioButton from "./StudioButton";

export default function AudioPanel() {
    const connected = useOBSConnection();
    const [inputs, setInputs] = useState([]);
    const [volumes, setVolumes] = useState({});

    useEffect(() => {
        if (!connected) return;

        const fetchInputs = async () => {
            try {
                const { inputs } = await sendToOBS("GetInputList");
                setInputs(inputs.slice(0, 3)); // take the first 3 inputs regardless of name

            } catch (err) {
                console.error("❌ Failed to load audio inputs from OBS:", err.message);
            }
        };

        fetchInputs();
    }, [connected]);

    useEffect(() => {
        if (!connected || inputs.length === 0) return;

        const interval = setInterval(async () => {
            const updates = {};
            for (const input of inputs) {
                try {
                    const { inputVolumeMul, inputMuted } = await sendToOBS("GetInputVolume", {
                        inputName: input.inputName
                    });
                    updates[input.inputName] = {
                        volume: inputVolumeMul,
                        muted: inputMuted
                    };
                } catch (err) {
                    console.warn(`⚠️ Failed to get volume for ${input.inputName}`);
                }
            }
            setVolumes((prev) => ({ ...prev, ...updates }));
        }, 500);

        return () => clearInterval(interval);
    }, [connected, inputs]);

    const setVolume = async (inputName, volume) => {
        await sendToOBS("SetInputVolume", {
            inputName,
            inputVolumeMul: volume
        });
    };

    const toggleMute = async (inputName) => {
        const muted = volumes[inputName]?.muted;
        await sendToOBS("SetInputMute", {
            inputName,
            inputMuted: !muted
        });
        setVolumes((prev) => ({
            ...prev,
            [inputName]: {
                ...prev[inputName],
                muted: !muted
            }
        }));
    };

    const renderVUPips = (volume) => {
        const pipCount = 10;
        const activePips = Math.floor(volume * pipCount);
        return (
            <div className="flex gap-[1px] h-2">
                {Array.from({ length: pipCount }).map((_, i) => {
                    let bg = "bg-gray-700";
                    if (i < activePips) {
                        const percent = (i + 1) / pipCount;
                        if (percent <= 0.66) bg = "bg-green-400";
                        else if (percent <= 0.81) bg = "bg-yellow-400";
                        else bg = "bg-red-500";
                    }
                    return <div key={i} className={`w-1 ${bg}`} />;
                })}
            </div>
        );
    };

    return (
        <div className="p-2 text-white bg-gray-900 rounded-md text-sm">
            <h2 className="text-lg font-semibold mb-2">🎚 Audio Mixer</h2>
            <div className="space-y-2">
                {inputs.map((input) => {
                    const state = volumes[input.inputName] || { volume: 0, muted: false };
                    return (
                        <div
                            key={input.inputName}
                            className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span>{input.inputName}</span>
                                <StudioButton
                                    label={state.muted ? "Unmute" : "Mute"}
                                    color={state.muted ? "red" : "green"}
                                    onClick={() => toggleMute(input.inputName)}
                                    full={false}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={state.volume}
                                    onChange={(e) => setVolume(input.inputName, parseFloat(e.target.value))}
                                    className="w-full accent-green-500"
                                />
                                {renderVUPips(state.volume)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
