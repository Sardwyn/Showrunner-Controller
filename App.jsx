import React, { useEffect, useState } from "react";
import CameraPanel from "./components/CameraPanel";
import LightingPanel from "./components/LightingPanel";
import RundownPanel from "./components/RundownPanel";
import AudioPanel from "./components/AudioPanel";
import SequencePanel from "./components/SequencePanel";
import GlobalControls from "./components/GlobalControls";
import VideoMonitor from "./components/VideoMonitor";
import OBSScenePanel from "./components/OBSScenePanel";
import ConnectionStatusBar from "./components/ConnectionStatusBar";
import PreviewMonitor from "./components/PreviewMonitor";


import "./pro-buttons.css";
import { connectOBS, sendToOBS } from "./utils/obsClient";

export default function App() {
    const [overrideScene, setOverrideScene] = useState(null);

    useEffect(() => {
        connectOBS();
    }, []);

    const triggerOverride = (sceneName) => {
        sendToOBS("SetCurrentProgramScene", { sceneName });
        setOverrideScene(sceneName);
    };

    const clearOverride = () => {
        setOverrideScene(null);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header and Global Controls */}
            <div className="p-4 bg-gray-900 text-white shadow-md">
                <h1 className="text-2xl font-bold mb-2">Scraplet Show Production Controller</h1>
                <GlobalControls />
                <ConnectionStatusBar obsConnected={true} unrealConnected={false} ndiConnected={true} />
            </div>

            {/* Override Banner */}
            {overrideScene && (
                <div className="bg-yellow-400 text-black font-bold px-4 py-2 shadow-inner text-center">
                    ⚡ OVERRIDE ACTIVE: {overrideScene}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Left-side panels */}
                <div className="w-1/4 p-4 space-y-6 overflow-y-auto bg-white">
                    <button
                        onClick={clearOverride}
                        className={`w-full py-2 rounded font-bold mb-4 ${overrideScene
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-gray-300 text-gray-600 opacity-50"
                            }`}
                    >
                        🚫 Clear Override
                    </button>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">Camera Control</h2>
                        <CameraPanel onOverride={triggerOverride} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">Lighting Control</h2>
                        <LightingPanel />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">Sequence Triggers</h2>
                        <SequencePanel />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">OBS Scene Control</h2>
                        <OBSScenePanel />
                    </div>
                </div>

                {/* Center section with video previews */}
                <div className="w-1/4 p-4 flex flex-col space-y-4 bg-gray-200">
                    <div className="flex-1 border border-gray-400 rounded-lg overflow-hidden">
                        <h2 className="text-lg font-semibold px-2 py-1 bg-gray-700 text-white">Preview Monitor</h2>
                        <PreviewMonitor />
                    </div>
                    <div className="flex-1 border border-gray-400 rounded-lg overflow-hidden">
                        <h2 className="text-lg font-semibold px-2 py-1 bg-gray-700 text-white">Program Monitor</h2>
                        <VideoMonitor type="program" aspectRatio="16:9" />
                    </div>
                </div>

                {/* Right-side panels */}
                <div className="flex flex-col flex-1 overflow-hidden space-y-4">
                    <div className="flex-grow overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">Rundown</h2>
                        <div className="h-full overflow-y-auto pr-1">
                            <RundownPanel overrideScene={overrideScene} onOverride={triggerOverride} />
                        </div>
                    </div>

                    <div className="mt-auto">
                        <h2 className="text-lg font-semibold mb-2 text-gray-800">Audio Channels</h2>
                        <div className="pr-1">
                            <AudioPanel />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
