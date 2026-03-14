// src/rundown/core/sceneRoles.ts
import { SceneRole, CANONICAL_SCENE_ROLES } from "./types";

export type SceneRoleMeta = {
  id: SceneRole;
  label: string;
  icon: string;
  description: string;
};

export const SCENE_ROLE_META: SceneRoleMeta[] = [
  {
    id: "live_gameplay",
    label: "Live Gameplay",
    icon: "🎮",
    description: "Primary gameplay scene while you’re live."
  },
  {
    id: "ad_break",
    label: "Ad Break",
    icon: "🍿",
    description: "Used for sponsor reads and ad segments."
  },
  {
    id: "brb",
    label: "BRB / Intermission",
    icon: "☕",
    description: "Short break screen while you’re away."
  },
  {
    id: "studio_two_shot",
    label: "Studio Two-Shot",
    icon: "🎥",
    description: "Main camera scene for interviews / desk."
  },
  {
    id: "pre_show",
    label: "Pre-Show",
    icon: "⏱️",
    description: "Warm-up scene before the show goes live."
  },
  {
    id: "post_show",
    label: "Post-Show",
    icon: "🏁",
    description: "Wrap-up scene after the show ends."
  },
  // If/when you add more roles, just extend here.
];

// Fast lookup map
export const SCENE_ROLE_META_MAP: Record<SceneRole, SceneRoleMeta> =
  CANONICAL_SCENE_ROLES.reduce((acc, role) => {
    const meta =
      SCENE_ROLE_META.find((m) => m.id === role) ??
      ({
        id: role,
        label: role,
        icon: "🎬",
        description: role
      } as SceneRoleMeta);

    acc[role] = meta;
    return acc;
  }, {} as Record<SceneRole, SceneRoleMeta>);

export function getSceneRoleMeta(role: SceneRole): SceneRoleMeta {
  return SCENE_ROLE_META_MAP[role];
}

export function sceneRoleLabel(role: SceneRole): string {
  return getSceneRoleMeta(role).label;
}
