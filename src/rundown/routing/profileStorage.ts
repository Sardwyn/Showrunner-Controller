// src/rundown/routing/profileStorage.ts
import { RoutingProfile, SceneRole, CANONICAL_SCENE_ROLES } from "../core/types";

const LOCAL_STORAGE_KEY = "scraplet_default_routing_profile";

export function loadRoutingProfile(): RoutingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as RoutingProfile;
  } catch {
    return null;
  }
}

export function saveRoutingProfile(profile: RoutingProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        ...profile,
        metadata: {
          ...(profile.metadata || {}),
          updatedAt: Date.now(),
        },
      })
    );
  } catch {
    // ignore
  }
}

// simple factory if nothing exists yet
export function createEmptyRoutingProfile(): RoutingProfile {
  return {
    id: "default",
    name: "Default Profile",
    roleMap: {} as Record<SceneRole, string>,
    metadata: {
      default: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}
