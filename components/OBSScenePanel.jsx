import React, { useEffect, useState } from "react";
import { sendToOBS } from "../utils/obsClient";
import { useOBSConnection } from "../hooks/useOBSConnection";
import StudioButton from "./StudioButton";


export default function OBSScenePanel() {
  const connected = useOBSConnection();
  const [scenes, setScenes] = useState([]);
  const [activeScene, setActiveScene] = useState(null);

  useEffect(() => {
    if (!connected) return;

    async function fetchScenes() {
      try {
        const { scenes } = await sendToOBS("GetSceneList");
        setScenes(scenes);
        // Try to get current active scene too:
        const { currentProgramSceneName } = await sendToOBS("GetCurrentProgramScene");
        setActiveScene(currentProgramSceneName);
      } catch (err) {
        console.error("❌ Unable to load scenes from OBS:", err.message);
      }
    }

    fetchScenes();
  }, [connected]);

  const handleSceneSwitch = async (sceneName) => {
    try {
      await sendToOBS("SetCurrentProgramScene", { sceneName });
      setActiveScene(sceneName);
    } catch (err) {
      console.error("❌ Failed to switch scene:", err.message);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-3">OBS Scenes</h2>
      {connected && scenes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {scenes.map((scene) => (
              <StudioButton
                  key={scene.sceneName}
                  label={scene.sceneName}
                  onClick={() => handleSceneSwitch(scene.sceneName)}
                  color={scene.sceneName === activeScene ? "blue" : "gray"}
                  isActive={scene.sceneName === activeScene}
              />


          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {connected ? "Loading scenes..." : "Connecting to OBS..."}
        </p>
      )}
    </div>
  );
}
