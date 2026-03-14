import { RoutingProfile, SceneRole } from "./types";

/**
 * Resolve a scene role to a concrete OBS scene name
 * using the provided routing profile.
 *
 * Returns null if:
 *  - no profile is provided
 *  - the role is unmapped
 */
export function resolveSceneFromRole(
  role: SceneRole,
  profile: RoutingProfile | null | undefined
): string | null {
  if (!profile) return null;
  return profile.roleMap?.[role] ?? null;
}

/**
 * Return true if all roles defined in the template exist
 * in the routing profile. Useful for editor warnings.
 */
export function validateRoutingProfile(
  requiredRoles: SceneRole[],
  profile: RoutingProfile | null | undefined
): {
  missing: SceneRole[];
  ok: boolean;
} {
  if (!profile)
    return {
      missing: [...requiredRoles],
      ok: false,
    };

  const missing = requiredRoles.filter((r) => !profile.roleMap?.[r]);

  return {
    missing,
    ok: missing.length === 0,
  };
}

/**
 * Extract all scene roles used by a template’s actions.
 * This is used so the editor can warn: "These roles are not mapped".
 */
export function collectRolesFromTemplate(
  template: {
    items: Record<
      string,
      { actions: { kind: string; config?: any }[] }
    >;
  }
): SceneRole[] {
  const roles = new Set<SceneRole>();

  for (const card of Object.values(template.items)) {
    for (const action of card.actions) {
      if (action.kind === "obsScene" && action.config?.role) {
        roles.add(action.config.role);
      }
    }
  }

  return Array.from(roles);
}
