// src/layoutConfig.js

export const MODES = {
  LIVE_GAMEPLAY: "live_gameplay",
  AD_READ: "ad_read",
  BRB: "brb",
};

/**
 * size:
 *  - "monitor"  → very tall (main preview/program monitors)
 *  - "tall"     → e.g. rundown during ad reads
 *  - "default"  → normal panel
 */

export const layoutConfig = {
  [MODES.LIVE_GAMEPLAY]: [
    // CENTER – main gameplay monitor + scenes + transitions
    { panelId: "programMonitor", zone: "center", order: 10, size: "monitor" },
    { panelId: "obsScenes", zone: "center", order: 20, size: "default" },

    // LEFT – preview + camera/lighting/audio
    { panelId: "previewMonitor", zone: "left", order: 10, size: "monitor" },
    { panelId: "camera", zone: "left", order: 20, size: "default" },
    { panelId: "debugEvents", zone: "left", order: 40, size: "tall" }, // ✅
    { panelId: "audio", zone: "left", order: 40, size: "default" },

    // RIGHT – rundown, chat, scrapbot status, debug
    { panelId: "rundown", zone: "right", order: 10, size: "default" },
    { panelId: "chat", zone: "right", order: 20, size: "default" },
    { panelId: "scrapbotStatus", zone: "right", order: 30, size: "default" },
  ],

  [MODES.AD_READ]: [
    // CENTER – Teleprompter owns the whole column
    {
      panelId: "teleprompter",
      zone: "center",
      order: 10,
      size: "monitor", // full-height center column
    },
    { panelId: "scrapbotStatus", zone: "center", order: 20, size: "default" },

    // LEFT – confidence/program + tech controls
    { panelId: "programMonitor", zone: "left", order: 10, size: "tall" },
    { panelId: "obsScenes", zone: "left", order: 20, size: "default" },
    { panelId: "audio", zone: "left", order: 50, size: "default" },
  

    // RIGHT – chat, scrapbot, scenes
    { panelId: "chat", zone: "right", order: 10, size: "tall" },
    { panelId: "rundown", zone: "right", order: 10, size: "default" },
  
  ],

  [MODES.BRB]: [
    // BRB – monitors are still tall but rebalanced
    { panelId: "programMonitor", zone: "center", order: 10, size: "monitor" },
    { panelId: "previewMonitor", zone: "left", order: 10, size: "monitor" },
    { panelId: "transition", zone: "center", order: 30, size: "default" },

    // Rundown less critical in BRB
    { panelId: "rundown", zone: "right", order: 10, size: "default" },

    // Chat & Scrapbot still visible
    { panelId: "chat", zone: "right", order: 20, size: "default" },
    { panelId: "scrapbotStatus", zone: "right", order: 30, size: "default" },

    // Tech stack: audio/lighting/camera/scenes
    { panelId: "audio", zone: "left", order: 20, size: "default" },
    { panelId: "lighting", zone: "left", order: 30, size: "default" },
    { panelId: "camera", zone: "left", order: 40, size: "default" },
    { panelId: "obsScenes", zone: "center", order: 20, size: "default" },
  ],
};
