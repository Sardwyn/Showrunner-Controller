// controllerLayout.js

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
import TransitionPanel from "./components/TransitionPanel";
import ScrapbotStatusPanel from "./components/ScrapbotStatusPanel";
import ChatPanel from "./components/ChatPanel";
import TeleprompterPanel from "./components/TeleprompterPanel";

// Registry: panelId → component
export const panelRegistry = {
  camera: CameraPanel,
  lighting: LightingPanel,
  rundown: RundownPanel,
  audio: AudioPanel,
  sequence: SequencePanel,
  global: GlobalControls,
  video: VideoMonitor,
  preview: PreviewMonitor,
  obs: OBSScenePanel,
  connection: ConnectionStatusBar,
  clock: StudioClock,
  scrapbot: ScrapbotStatusPanel,
  chat: ChatPanel,
  transition: TransitionPanel,
  teleprompter: TeleprompterPanel, // ✅ NEW
};

export const Modes = ["live_gameplay", "ad_read", "brb"];

// Layout model:
// - zone: "left" | "center" | "right"
// - size: "small" | "medium" | "large"
// - order: vertical order within the zone

export const layoutConfig = {
    live_gameplay: [
    // LEFT
    {
      id: "live-camera",
      panelId: "camera",
      title: "Camera Control",
      zone: "left",
      order: 1,
      size: "medium",
    },
    {
      id: "live-lighting",
      panelId: "lighting",
      title: "Lighting Control",
      zone: "left",
      order: 2,
      size: "small",
    },
    {
      id: "live-sequence",
      panelId: "sequence",
      title: "Sequence Triggers",
      zone: "left",
      order: 3,
      size: "small",
    },
    {
      id: "live-obs",
      panelId: "obs",
      title: "OBS Scene Control",
      zone: "left",
      order: 4,
      size: "small",
    },

    // CENTER
    {
      id: "live-preview",
      panelId: "preview",
      title: "Preview Monitor",
      zone: "center",
      order: 1,
      size: "medium",
    },
    {
      id: "live-program",
      panelId: "video",
      title: "Program Monitor",
      zone: "center",
      order: 2,
      size: "medium",
      props: { type: "program" },
    },
    {
      id: "live-transition",
      panelId: "transition",
      title: "Transitions",
      zone: "center",
      order: 3,
      size: "small",
    },

    // RIGHT
    {
      id: "live-rundown",
      panelId: "rundown",
      title: "Rundown",
      zone: "right",
      order: 1,
      size: "large",
    },
    {
      id: "live-chat",
      panelId: "chat",
      title: "Chat",
      zone: "right",
      order: 2,
      size: "medium",
    },
    {
      id: "live-scrapbot",
      panelId: "scrapbot",
      title: "Scrapbot Status",
      zone: "right",
      order: 3,
      size: "small",
    },
    {
      id: "live-audio",
      panelId: "audio",
      title: "Audio Channels",
      zone: "right",
      order: 4,
      size: "medium",
    },
  ],

  ad_read: [
    // LEFT – tools, smaller
    {
      id: "ad-camera",
      panelId: "camera",
      title: "Camera Control",
      zone: "left",
      order: 1,
      size: "small",
    },
    {
      id: "ad-lighting",
      panelId: "lighting",
      title: "Lighting Control",
      zone: "left",
      order: 2,
      size: "small",
    },
    {
      id: "ad-sequence",
      panelId: "sequence",
      title: "Sequence Triggers",
      zone: "left",
      order: 3,
      size: "small",
    },
    {
      id: "ad-obs",
      panelId: "obs",
      title: "OBS Scene Control",
      zone: "left",
      order: 4,
      size: "small",
    },

    // CENTER – Teleprompter owns the whole column
    {
      id: "ad-teleprompter-center",
      panelId: "teleprompter",
      title: "Teleprompter",
      zone: "center",
      order: 1,
      size: "large", // ✅ full-height column
    },

    // RIGHT – tools
    {
      id: "ad-chat",
      panelId: "chat",
      title: "Chat",
      zone: "right",
      order: 1,
      size: "medium",
    },
    {
      id: "ad-scrapbot",
      panelId: "scrapbot",
      title: "Scrapbot Status",
      zone: "right",
      order: 2,
      size: "medium",
    },
    {
      id: "ad-audio",
      panelId: "audio",
      title: "Audio Channels",
      zone: "right",
      order: 3,
      size: "small",
    },
    {
      id: "ad-transition",
      panelId: "transition",
      title: "Transitions",
      zone: "right",
      order: 4,
      size: "small",
    },
  ],

  brb: [
    // LEFT – same as live for now
    {
      id: "brb-camera",
      panelId: "camera",
      title: "Camera Control",
      zone: "left",
      order: 1,
      size: "medium",
    },
    {
      id: "brb-lighting",
      panelId: "lighting",
      title: "Lighting Control",
      zone: "left",
      order: 2,
      size: "small",
    },
    {
      id: "brb-sequence",
      panelId: "sequence",
      title: "Sequence Triggers",
      zone: "left",
      order: 3,
      size: "small",
    },
    {
      id: "brb-obs",
      panelId: "obs",
      title: "OBS Scene Control",
      zone: "left",
      order: 4,
      size: "small",
    },

    // CENTER – same as live for now
    {
      id: "brb-preview",
      panelId: "preview",
      title: "Preview Monitor",
      zone: "center",
      order: 1,
      size: "medium",
    },
    {
      id: "brb-program",
      panelId: "video",
      title: "Program Monitor",
      zone: "center",
      order: 2,
      size: "medium",
      props: { type: "program" },
    },
    {
      id: "brb-transition",
      panelId: "transition",
      title: "Transitions",
      zone: "center",
      order: 3,
      size: "small",
    },

    // RIGHT – same as live for now
    {
      id: "brb-rundown",
      panelId: "rundown",
      title: "Rundown",
      zone: "right",
      order: 1,
      size: "large",
    },
    {
      id: "brb-chat",
      panelId: "chat",
      title: "Chat",
      zone: "right",
      order: 2,
      size: "medium",
    },
    {
      id: "brb-scrapbot",
      panelId: "scrapbot",
      title: "Scrapbot Status",
      zone: "right",
      order: 3,
      size: "small",
    },
    {
      id: "brb-audio",
      panelId: "audio",
      title: "Audio Channels",
      zone: "right",
      order: 4,
      size: "medium",
    },
  ],
};
