// src/rundown/routing/sceneRouting.ts
export type SceneRole =
  | "live"
  | "brb"
  | "ad"
  | "gameplay"
  | "cam"
  | "interview"
  | "desk"
  | "intro"
  | "outro";

export type RoutingProfile = {
  [role in SceneRole]?: string; // real OBS scene name
};

const LOCAL_STORAGE_KEY = "scraplet_scene_routing_profile";

export function loadRoutingProfile(): RoutingProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as RoutingProfile;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveRoutingProfile(profile: RoutingProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(profile)
    );
  } catch {
    // ignore
  }
}

export const ALL_SCENE_ROLES: SceneRole[] = [
  "live",
  "gameplay",
  "cam",
  "desk",
  "interview",
  "ad",
  "brb",
  "intro",
  "outro",
];
