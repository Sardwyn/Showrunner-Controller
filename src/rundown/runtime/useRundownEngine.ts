// src/rundown/runtime/useRundownEngine.ts
import { useCallback, useMemo, useState } from "react";
import {
  ComponentAddressV1,
  OverlayRuntimePacketV1,
  createOverlayRuntimePacketV1,
} from "@scraplet/contracts/overlayRuntime";
import {
  RundownTemplate,
  ShowInstance,
  ShowCard,
  RoutingProfile,
  RuntimeEffect,
  LayoutMode,
  SceneRole,
  CardTrigger,
  CardBehaviour,
  RundownAction,
  ExternalEventEnvelope,
  TemplateCard,
} from "../core/types";
import {
  createShowInstanceFromTemplate,
  rundownReducer,
  RundownReducerAction,
} from "../core/reducer";
import { expandRuntimeEffects } from "../core/actionExecutor";
import { evaluateExternalEvent } from "../core/eventEvaluator";

export type UseRundownEngineOptions = {
  routingProfile?: RoutingProfile | null;
  onLayoutModeChange?: (layoutMode: LayoutMode) => void;
  onObsSceneChange?: (role: SceneRole, sceneName: string | null) => void;
  onOverlayEffect?: (payload: any) => void;
  onComponentEffect?: (payload: any) => void;
  onBotMessage?: (payload: { channelRole?: string; message: string }) => void;
  onSound?: (payload: {
    soundId: string;
    volume?: number;
    duckOthers?: boolean;
  }) => void;
};

function safeJsonParse(input: string | undefined, fallback: any) {
  const value = String(input || "").trim();
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildComponentRuntimePacket(input: {
  address: ComponentAddressV1;
  operation: "show" | "hide" | "setProp" | "setState" | "dispatch";
  producer?: string;
  platform?: string;
  patchText?: string;
  event?: string;
  dataText?: string;
}): OverlayRuntimePacketV1 {
  const producer = input.producer || "studio-controller";
  const platform = input.platform || "internal";
  const tenantId = String(input.address.tenantId || "");

  if (!tenantId) {
    throw new Error("Component target is missing tenantId");
  }

  const scope = {
    tenantId,
    overlayPublicId: input.address.overlayPublicId,
    componentInstanceId:
      input.address.kind === "native" ? input.address.componentInstanceId : undefined,
  };

  let type = "component.show";
  let payload: Record<string, any> = {};

  if (input.operation === "hide") {
    type = "component.hide";
  } else if (input.operation === "setProp") {
    type = "component.setProp";
    payload = { patch: safeJsonParse(input.patchText, {}) };
  } else if (input.operation === "setState") {
    type = "component.setState";
    payload = { patch: safeJsonParse(input.patchText, {}) };
  } else if (input.operation === "dispatch") {
    type = "component.dispatch";
    payload = {
      event: String(input.event || "").trim(),
      data: safeJsonParse(input.dataText, {}),
    };
  }

  return createOverlayRuntimePacketV1({
    header: {
      id: `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      ts: Date.now(),
      producer,
      platform,
      scope,
    },
    payload,
  });
}

export type UseRundownEngineResult = {
  show: ShowInstance;
  currentItem: ShowCard | undefined;
  groups: ShowInstance["groups"];
  items: ShowInstance["items"];
  startShow: () => void;
  selectItem: (itemId: string) => void;
  nextItem: () => void;
  skipNextItem: () => void;
  triggerEventCard: (cardId: string) => void;
  handleExternalEvent: (event: ExternalEventEnvelope) => void;
  endInterrupt: () => void;
  tick: (deltaSeconds: number) => void;
};



// src/rundown/runtime/useRundownEngine.ts
export function useRundownEngine(
  initialTemplate: RundownTemplate,
  options: UseRundownEngineOptions = {}
): UseRundownEngineResult {
  // Always use the latest profile from props
  const routingProfile: RoutingProfile | null =
    options.routingProfile ?? null;

  const [show, setShow] = useState<ShowInstance>(() =>
    createShowInstanceFromTemplate(initialTemplate, `show-${Date.now()}`, {
      routingProfileId: routingProfile?.id,
    })
  );

  const handleEffects = useCallback(
    (effects: RuntimeEffect[]) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "SWITCH_LAYOUT":
            options.onLayoutModeChange?.(effect.payload.layoutMode);
            break;

          case "SWITCH_OBS_SCENE":
            options.onObsSceneChange?.(
              effect.payload.role,
              effect.payload.resolvedSceneName ?? null
            );
            break;

          case "SHOW_OVERLAY":
            options.onOverlayEffect?.(effect.payload);
            break;

          case "CONTROL_COMPONENT":
            options.onComponentEffect?.({
              ...effect.payload,
              packet: buildComponentRuntimePacket({
                address: effect.payload.target,
                operation: effect.payload.operation,
                patchText: effect.payload.patchText,
                event: effect.payload.event,
                dataText: effect.payload.dataText,
              }),
            });
            break;

          case "SEND_BOT_MESSAGE":
            options.onBotMessage?.(effect.payload);
            break;

          case "PLAY_SOUND":
            options.onSound?.(effect.payload);
            break;

          default:
            // Unknown effect types (future-proof) are ignored safely
            break;
        }
      }
    },
    [options]
  );

  const dispatchRundown = useCallback(
    (action: RundownReducerAction) => {
      // compute from current show, not inside setState
      const { state: nextState, effects: rawEffects } = rundownReducer(
        show,
        action
      );

      const expandedEffects = expandRuntimeEffects(rawEffects, {
        getCardById: (itemId: string) => nextState.items[itemId],
        ctx: { routingProfile },
      });

      setShow(nextState);
      handleEffects(expandedEffects);
    },
    [show, handleEffects, routingProfile]
  );

  // START SHOW: mark show started + arm first card
const startShow = useCallback(() => {
  dispatchRundown({
    type: "START_SHOW",
  });
}, [dispatchRundown]);


  const selectItem = useCallback(
    (itemId: string) => {
      dispatchRundown({
        type: "SELECT_ITEM",
        itemId,
        manual: true,
      });
    },
    [dispatchRundown]
  );

  const nextItem = useCallback(() => {
    dispatchRundown({ type: "NEXT_ITEM" });
  }, [dispatchRundown]);

  const skipNextItem = useCallback(() => {
    dispatchRundown({ type: "SKIP_NEXT_ITEM" });
  }, [dispatchRundown]);


    const endInterrupt = useCallback(() => {
    dispatchRundown({ type: "END_INTERRUPT" });
  }, [dispatchRundown]);


  const triggerEventCard = useCallback(
    (cardId: string) => {
      dispatchRundown({
        type: "EXTERNAL_EVENT_RECEIVED",
        cardId,
      });
    },
    [dispatchRundown]
  );

  const tick = useCallback(
  (deltaSeconds: number) => {
    dispatchRundown({
      type: "UPDATE_TIMER",
      deltaSeconds,
    });
  },
  [dispatchRundown]
);


  // ----- NEW: compute event cards (those with trigger.mode === "external") -----
  const eventCards: TemplateCard[] = useMemo(
    () =>
      Object.values(initialTemplate.items).filter(
        (card) => card.trigger?.mode === "external"
      ),
    [initialTemplate]
  );

  const handleExternalEvent = useCallback(
    (event: ExternalEventEnvelope) => {
      if (!eventCards.length) {
        console.warn(
          "[RundownEngine] Received external event but no event cards are configured:",
          event
        );
        return;
      }

      const decision = evaluateExternalEvent(event, eventCards);

      if (decision.decision === "ignore") {
        console.log(
          "[RundownEngine] External event ignored by evaluator:",
          event
        );
        return;
      }

      // v1: treat both "interrupt" and "queue" as immediate interrupt
      const cardId = decision.cardId;

      dispatchRundown({
        type: "EXTERNAL_EVENT_RECEIVED",
        cardId,
      });
    },
    [dispatchRundown, eventCards]
  );

  const currentItem: ShowCard | undefined = useMemo(() => {
    if (!show.currentItemId) return undefined;
    return show.items[show.currentItemId];
  }, [show]);

    return {
    show,
    currentItem,
    groups: show.groups,
    items: show.items,
    startShow,
    selectItem,
    nextItem,
    skipNextItem,
    triggerEventCard,
    handleExternalEvent,
    endInterrupt,
    tick,
  };

}

/**
 * Demo template – same as before, but with one external "Raid Celebration" card
 * so we can prove the external event pipeline works.
 */
export function createDemoTemplate(): RundownTemplate {
  const baseTrigger: CardTrigger = { mode: "manual" };
  const baseBehaviour: CardBehaviour = {
    priority: "normal",
    autoConfirm: false,
  };

  const makeAction = (
    kind: RundownAction["kind"],
    phase: RundownAction["phase"],
    config: any
  ): RundownAction => ({
    id: `act-${kind}-${phase}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    phase,
    config,
  });

  return {
    id: "demo-template-1",
    title: "Demo Show Template",
    version: 1,
    groups: [
      {
        id: "grp-pre",
        title: "Pre-show",
        itemIds: ["pre-1"],
      },
      {
        id: "grp-main",
        title: "Main Show",
        itemIds: ["seg-1", "seg-2", "ad-1"],
      },
      // NOTE: the raid event card does NOT need to be in a group to be usable
    ],
    items: {
      "pre-1": {
        id: "pre-1",
        title: "Pre-show Warmup",
        type: "segment",
        duration: 60,
        trigger: baseTrigger,
        behaviour: baseBehaviour,
        actions: [
          makeAction("layout", "enter", { layoutMode: "pre_show" }),
          makeAction("obsScene", "enter", { role: "pre_show" }),
        ],
        metadata: {
          notes: "Say hello, check audio, tease what's coming.",
        },
      },
      "seg-1": {
        id: "seg-1",
        title: "Opening Segment",
        type: "segment",
        duration: 300,
        trigger: baseTrigger,
        behaviour: baseBehaviour,
        actions: [
          makeAction("layout", "enter", { layoutMode: "live_gameplay" }),
          makeAction("obsScene", "enter", { role: "live_gameplay" }),
        ],
        metadata: { notes: "Main cam + gameplay." },
      },
      "seg-2": {
        id: "seg-2",
        title: "Chat & Q&A",
        type: "chat",
        duration: 180,
        trigger: baseTrigger,
        behaviour: baseBehaviour,
        actions: [
          makeAction("layout", "enter", { layoutMode: "studio" }),
          makeAction("obsScene", "enter", { role: "studio_two_shot" }),
        ],
        metadata: { notes: "Switch to studio two-shot for Q&A." },
      },
      "ad-1": {
        id: "ad-1",
        title: "Sponsored Segment",
        type: "ad",
        duration: 90,
        trigger: baseTrigger,
        behaviour: {
          priority: "interrupt",
          autoConfirm: true,
        },
        actions: [
          makeAction("layout", "enter", { layoutMode: "ad_read" }),
          makeAction("obsScene", "enter", { role: "ad_break" }),
          makeAction("botMessage", "enter", {
            channelRole: "main",
            message: "We’re taking a short sponsored break!",
          }),
        ],
        metadata: { notes: "Read sponsor, run ad roll." },
      },
      // NEW: external raid celebration event card
      "raid-1": {
        id: "raid-1",
        title: "Raid Celebration",
        type: "event",
        duration: 45,
        trigger: {
          mode: "external",
          external: {
            source: "kick",
            type: "kick.raid",
            conditions: [
              {
                field: "viewerCount",
                op: ">=",
                value: 10,
              },
            ],
          },
        },
        behaviour: {
          priority: "interrupt",
          autoConfirm: true,
        },
        actions: [
          makeAction("layout", "enter", { layoutMode: "studio" }),
          makeAction("obsScene", "enter", { role: "studio_two_shot" }),
          makeAction("widgetOverlay", "enter", {
            widgetId: "raid_banner",
            action: "show_with_payload",
            payload: {
              headline: "RAID INCOMING!",
            },
          }),
          makeAction("botMessage", "enter", {
            channelRole: "main",
            message:
              "Welcome raiders! Thanks for the support – grab a seat and say hi in chat!",
          }),
          makeAction("sound", "enter", {
            soundId: "raid_fanfare",
            volume: 0.9,
            duckOthers: true,
          }),
        ],
        metadata: { notes: "Triggered automatically when a raid happens." },
      },
    },
    metadata: {
      notes: "Demo template generated in useRundownEngine.",
    },
  };
}
