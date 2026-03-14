// src/rundown/core/actionExecutor.ts
import {
  ShowCard,
  RundownAction,
  ActionPhase,
  RoutingProfile,
  LayoutAction,
  ObsSceneAction,
  ComponentAction,
  WidgetOverlayAction,
  BotMessageAction,
  SoundAction,
  SceneRole,
  SwitchLayoutEffect,
  SwitchObsSceneEffect,
  ControlComponentEffect,
  ShowOverlayEffect,
  SendBotMessageEffect,
  PlaySoundEffect,
  
} from "./types";
import { resolveSceneFromRole } from "./routing";
import { RawRuntimeEffect, RuntimeEffect, /* ... */ } from "./types";

export interface ActionExecutionContext {
  routingProfile?: RoutingProfile | null;
}

/**
 * Given a card + phase, resolve all its actions into
 * concrete RuntimeEffects (layout, OBS scene, widget, bot, sound).
 *
 * This does NOT perform any real side-effects – the caller
 * is responsible for consuming the returned effects.
 */
export function resolveActionEffectsForCardPhase(
  card: ShowCard,
  phase: Exclude<ActionPhase, "both">,
  ctx: ActionExecutionContext = {}
): RuntimeEffect[] {
  const effects: RuntimeEffect[] = [];

  const relevantActions = filterActionsForPhase(card.actions, phase);

  for (const action of relevantActions) {
    switch (action.kind) {
      case "layout": {
        const layoutAction = action as LayoutAction;
        effects.push(makeSwitchLayoutEffect(layoutAction.config.layoutMode));
        break;
      }

      case "obsScene": {
        const obsAction = action as ObsSceneAction;
        const role: SceneRole = obsAction.config.role;
        const resolvedSceneName = resolveSceneFromRole(
          role,
          ctx.routingProfile || null
        );
        effects.push(makeSwitchObsSceneEffect(role, resolvedSceneName));
        break;
      }

      case "component": {
        const componentAction = action as ComponentAction;
        effects.push(
          makeControlComponentEffect(
            componentAction.config.target,
            componentAction.config.operation,
            componentAction.config.patchText,
            componentAction.config.event,
            componentAction.config.dataText
          )
        );
        break;
      }

      case "widgetOverlay": {
        const widgetAction = action as WidgetOverlayAction;
        effects.push(
          makeShowOverlayEffect(
            widgetAction.config.widgetId,
            widgetAction.config.action,
            widgetAction.config.payload
          )
        );
        break;
      }

      case "botMessage": {
        const botAction = action as BotMessageAction;
        effects.push(
          makeSendBotMessageEffect(
            botAction.config.channelRole,
            botAction.config.message
          )
        );
        break;
      }

      case "sound": {
        const soundAction = action as SoundAction;
        effects.push(
          makePlaySoundEffect(
            soundAction.config.soundId,
            soundAction.config.volume,
            soundAction.config.duckOthers
          )
        );
        break;
      }

      default:
        // Unknown / future kinds are safely ignored.
        break;
    }
  }

  return effects;
}

/**
 * Convenience helper: feed in a list of runtime effects from the reducer,
 * and expand EXECUTE_ENTER_ACTIONS / EXECUTE_EXIT_ACTIONS into concrete
 * layout/scene/widget/bot/sound effects.
 */

export function expandRuntimeEffects(
  rawEffects: RawRuntimeEffect[],
  options: {
    getCardById: (itemId: string) => ShowCard | undefined;
    ctx?: ActionExecutionContext;
  }
): RuntimeEffect[] {

  const expanded: RuntimeEffect[] = [];

  for (const effect of rawEffects) {
    if (effect.type === "EXECUTE_ENTER_ACTIONS") {
      const itemId = effect.payload.itemId;
      const card = options.getCardById(itemId);
      if (!card) continue;

      const actionEffects = resolveActionEffectsForCardPhase(
        card,
        "enter",
        options.ctx
      );
      expanded.push(...actionEffects);
      continue;
    }

    if (effect.type === "EXECUTE_EXIT_ACTIONS") {
      const itemId = effect.payload.itemId;
      const card = options.getCardById(itemId);
      if (!card) continue;

      const actionEffects = resolveActionEffectsForCardPhase(
        card,
        "exit",
        options.ctx
      );
      expanded.push(...actionEffects);
      continue;
    }

    // Non-action effects can be passed through as-is
    expanded.push(effect);
  }

  return expanded;
}

//
// Internal helpers
//

function filterActionsForPhase(
  actions: RundownAction[],
  phase: Exclude<ActionPhase, "both">
): RundownAction[] {
  return actions.filter(
    (a) => a.phase === phase || a.phase === "both"
  );
}

function makeSwitchLayoutEffect(layoutMode: string): SwitchLayoutEffect {
  return {
    type: "SWITCH_LAYOUT",
    payload: { layoutMode },
  };
}

function makeSwitchObsSceneEffect(
  role: SceneRole,
  resolvedSceneName: string | null
): SwitchObsSceneEffect {
  return {
    type: "SWITCH_OBS_SCENE",
    payload: {
      role,
      resolvedSceneName: resolvedSceneName ?? undefined,
    },
  };
}

function makeShowOverlayEffect(
  widgetId: string,
  action: "show" | "hide" | "toggle",
  payload?: any
): ShowOverlayEffect {
  return {
    type: "SHOW_OVERLAY",
    payload: {
      widgetId,
      action,
      payload,
    },
  };
}

function makeControlComponentEffect(
  target: ComponentAction["config"]["target"],
  operation: ComponentAction["config"]["operation"],
  patchText?: string,
  event?: string,
  dataText?: string
): ControlComponentEffect {
  return {
    type: "CONTROL_COMPONENT",
    payload: {
      target,
      operation,
      patchText,
      event,
      dataText,
    },
  };
}

function makeSendBotMessageEffect(
  channelRole: string | undefined,
  message: string
): SendBotMessageEffect {
  return {
    type: "SEND_BOT_MESSAGE",
    payload: {
      channelRole,
      message,
    },
  };
}

function makePlaySoundEffect(
  soundId: string,
  volume?: number,
  duckOthers?: boolean
): PlaySoundEffect {
  return {
    type: "PLAY_SOUND",
    payload: {
      soundId,
      volume,
      duckOthers,
    },
  };
}
