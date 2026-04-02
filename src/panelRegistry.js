// src/panelRegistry.js
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
import StudioClock from "./components/StudioClock";
import ScrapbotStatusPanel from "./components/ScrapbotStatusPanel";
import ChatPanel from "./components/ChatPanel";
import TransitionPanel from "./components/TransitionPanel";
import DebugEventPanel from "./components/DebugEventPanel";
import SubathonTimerPanel from "./components/SubathonTimerPanel";

export const PANEL_REGISTRY = {
  videoMonitor: {
    id: "videoMonitor",
    label: "Program Monitor",
    component: VideoMonitor,
    defaultSize: "monitor",
    icon: "monitor", // hook this up later
    tags: ["core", "program"],
  },
  previewMonitor: {
    id: "previewMonitor",
    label: "Preview Monitor",
    component: PreviewMonitor,
    defaultSize: "monitor",
    icon: "monitor-preview",
    tags: ["core", "preview"],
  },
  rundown: {
    id: "rundown",
    label: "Rundown",
    component: RundownPanel,
    defaultSize: "tall",
    tags: ["show-control"],
  },
  subathonTimer: {
    id: "subathonTimer",
    label: "Subathon Timer",
    component: SubathonTimerPanel,
    defaultSize: "compact",
    icon: "timer",
    tags: ["show-control", "subathon"],
  },
  // ...repeat for camera, lighting, chat, scrapbotStatus, transition, etc.
};
