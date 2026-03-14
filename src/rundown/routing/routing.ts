// src/rundown/runtime/routing.ts
import { SceneRole, RoutingProfile, CANONICAL_SCENE_ROLES } from "../core/types";

/**
 * Resolve a SceneRole into a concrete OBS scene name.
 *
 * Rules:
 * - If we have a RoutingProfile and a roleMap entry → use it.
 * - If we DON'T have a profile, but the "role" is some arbitrary string,
 *   we allow using it directly as a scene name (escape hatch).
 * - Otherwise return null, and the caller should skip trying to switch.
 */
export function resolveSceneFromRole(
  role: SceneRole,
  profile: RoutingProfile | null
): string | null {
  if (profile && profile.roleMap && profile.roleMap[role]) {
    return profile.roleMap[role];
  }

  // If there's no mapping but the "role" is not one of our known canonical ones,
  // we treat it as a raw scene name. This is deliberate, not guessing:
  // you could have a template that encodes direct scene names instead of roles.
  if (!profile && !CANONICAL_SCENE_ROLES.includes(role)) {
    return role;
  }

  return null;
}
