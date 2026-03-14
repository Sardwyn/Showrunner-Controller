// rundownTypes.ts

// still in rundownTypes.ts (types.ts)

// Canonical roles we actually expose in the UI.
// The trailing `| string` on SceneRole is just future-proofing, we ignore it here.
export const CANONICAL_SCENE_ROLES: SceneRole[] = [
  "live_gameplay",
  "ad_break",
  "brb",
  "studio_two_shot",
  "pre_show",
  "post_show",
];


//
// 1. Primitive enums/unions
//

export type CardType =
  | "segment"
  | "ad"
  | "break"
  | "chat"
  | "vt"
  | "gfx"
  | "event";

export type TriggerMode = "manual" | "external";

export type ExternalSource =
  | "kick"
  | "scrapbot"
  | "twitch"
  | "youtube"
  | "generic"
  | string; // future-proof

export type ExternalEventType =
  | "raid"
  | "tip"
  | "subscription"
  | "command"
  | "custom"
  | string; // future-proof

export type Priority = "normal" | "interrupt" | "queue";

export type CardStatus = "pending" | "live" | "done" | "skipped";

export type ActionPhase = "enter" | "exit" | "both";

// Logical roles for scenes/layouts; extend freely.
export type SceneRole =
  | "live_gameplay"
  | "ad_break"
  | "brb"
  | "studio_two_shot"
  | "pre_show"
  | "post_show"
  | string; // future-proof

export type LayoutMode =
  | "live_gameplay"
  | "ad_read"
  | "brb"
  | "studio"
  | "minimal"
  | string; // future-proof

//
// 2. Triggers and conditions
//

export type ConditionOp =
  | "=="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contains"
  | "not_contains";

export interface TriggerCondition {
  field: string;     // e.g. "viewerCount", "amount", "tier"
  op: ConditionOp;
  value: number | string | boolean;
}

export interface ExternalTriggerConfig {
  source: ExternalSource;       // "kick", "scrapbot", etc.
  type: ExternalEventType;     // "raid", "tip", "subscription", "command", etc.
  conditions?: TriggerCondition[];
}

export interface CardTrigger {
  mode: TriggerMode;
  external?: ExternalTriggerConfig; // only when mode === "external"
}

//
// 3. Behaviour & metadata
//

export interface CardBehaviour {
  priority: Priority;    // normal | interrupt | queue
  autoConfirm: boolean;  // if true, fires without operator confirm
}

export interface CardMetadata {
  notes?: string;
  tags?: string[];
  [key: string]: any; // flexible for future editor data
}

//
// 4. Actions
//

// Known action kinds; unknown must still be allowed at runtime.
export type KnownActionKind =
  | "layout"
  | "obsScene"
  | "component"
  | "widgetOverlay"
  | "botMessage"
  | "sound";

export type ActionKind = KnownActionKind | string;

// Base generic action
export interface BaseAction<TKind extends ActionKind = ActionKind, TConfig = any> {
  id: string;
  kind: TKind;
  phase: ActionPhase;
  config: TConfig;
}

// Layout action
export interface LayoutActionConfig {
  layoutMode: LayoutMode;
}

export type LayoutAction = BaseAction<"layout", LayoutActionConfig>;

// OBS scene action (via role)
export interface ObsSceneActionConfig {
  role: SceneRole; // e.g. "ad_break"
}

export type ObsSceneAction = BaseAction<"obsScene", ObsSceneActionConfig>;

export interface ComponentActionTarget {
  kind: "native" | "widget";
  tenantId?: string;
  overlayPublicId: string;
  componentInstanceId?: string;
  widgetType?: string;
  widgetId?: string;
}

export interface ComponentActionConfig {
  target: ComponentActionTarget;
  operation: "show" | "hide" | "setProp" | "setState" | "dispatch";
  patchText?: string;
  event?: string;
  dataText?: string;
}

export type ComponentAction = BaseAction<"component", ComponentActionConfig>;

// Widget overlay action
export interface WidgetOverlayActionConfig {
  widgetId: string;      // logical widget name/id
  action: "show" | "hide" | "toggle";
  payload?: any;         // data to send to overlay bus
}

export type WidgetOverlayAction = BaseAction<
  "widgetOverlay",
  WidgetOverlayActionConfig
>;

// Bot message action
export interface BotMessageActionConfig {
  channelRole?: "main" | "alt" | string; // allows multi-channel later
  message: string;
}

export type BotMessageAction = BaseAction<
  "botMessage",
  BotMessageActionConfig
>;

// Sound action
export interface SoundActionConfig {
  soundId: string;         // logical name of SFX
  volume?: number;         // 0-1
  duckOthers?: boolean;    // duck background audio
}

export type SoundAction = BaseAction<"sound", SoundActionConfig>;

// Unknown/custom action – MUST be skipped safely by executor
export type UnknownAction = BaseAction<string, any>;

// All actions
export type RundownAction =
  | LayoutAction
  | ObsSceneAction
  | ComponentAction
  | WidgetOverlayAction
  | BotMessageAction
  | SoundAction
  | UnknownAction;

//
// 5. Card models (template vs runtime)
//

// Base card shape shared by template & runtime
export interface CardBase {
  id: string;
  title: string;
  type: CardType;
  duration?: number;      // planned duration in seconds
  trigger: CardTrigger;
  behaviour: CardBehaviour;
  actions: RundownAction[];
  metadata?: CardMetadata;
}

// Template card (static)
export interface TemplateCard extends CardBase {
  // no extra fields for now – purely structural
}

// Runtime card (per-show instance)
export interface ShowCard extends CardBase {
  status: CardStatus;
  elapsed: number;        // seconds elapsed in runtime
  modified: boolean;      // has runtime override applied
  // optional runtime overrides (if you want to track diffs)
  overriddenFields?: Partial<CardBase>;
}

//
// 6. Groups & templates
//

export interface TemplateGroup {
  id: string;
  title: string;
  itemIds: string[]; // references into Template.items / ShowInstance.items
}

export interface RundownTemplate {
  id: string;
  title: string;
  version: number;
  groups: TemplateGroup[];
  // Flat dictionary of cards for O(1) lookup
  items: Record<string, TemplateCard>;
  // Optional metadata for template-level info
  metadata?: {
    createdAt?: number;
    updatedAt?: number;
    authorId?: string | number;
    [key: string]: any;
  };
}

//
// 7. Show instance & interrupt stack
//

export interface InterruptFrame {
  itemId: string;             // the item that was active
  previousLayoutMode?: LayoutMode;
  previousSceneRole?: SceneRole;
  previousStartedAt?: number; // timestamp
  previousElapsed?: number;   // seconds
  // Extendable: you can stash more runtime context here if needed
  [key: string]: any;
}

export interface ShowInstance {
  id: string;
  templateId: string;
  title: string;
  startedAt?: number;             // epoch seconds
  endedAt?: number;
  currentItemId?: string;
  interruptStack: InterruptFrame[];
  groups: TemplateGroup[];        // copied from template
  items: Record<string, ShowCard>; // runtime-copy of template items
  routingProfileId?: string;      // which OBS routing profile is bound
  metadata?: {
    notes?: string;
    [key: string]: any;
  };
}

//
// 8. Routing profiles (OBS scene roles -> concrete scene names)
//

export interface RoutingProfile {
  id: string;
  name: string;
  // role -> actual OBS scene name
  roleMap: Record<SceneRole, string>;
  metadata?: {
    default?: boolean;
    createdAt?: number;
    updatedAt?: number;
    [key: string]: any;
  };
}

//
// 9. External events (from Scrapbot / platforms into controller)
//

export interface ExternalEventEnvelope<TPayload = any> {
  id?: string;
  source: ExternalSource;    // "kick", "scrapbot", etc
  type: string;              // e.g. "kick.raid", "scrapbot.command.brb"
  payload: TPayload;
  receivedAt: number;        // epoch ms
}

// Example specialised payloads (optional helpers)
export interface KickRaidPayload {
  raiderName: string;
  viewerCount: number;
  avatarUrl?: string;
  timestamp: number;
  [key: string]: any;
}

export interface ScrapbotCommandPayload {
  command: string;        // e.g. "!brb"
  args?: string[];
  userName: string;
  userId?: string | number;
  [key: string]: any;
}

//
// 10. Runtime effects (outputs from reducer – used in Step 2)
//

export type RuntimeEffectType =
  | "EXECUTE_ENTER_ACTIONS"
  | "EXECUTE_EXIT_ACTIONS"
  | "SWITCH_LAYOUT"
  | "SWITCH_OBS_SCENE"
  | "CONTROL_COMPONENT"
  | "SHOW_OVERLAY"
  | "SEND_BOT_MESSAGE"
  | "PLAY_SOUND";

export interface BaseRuntimeEffect<TType extends RuntimeEffectType, TPayload = any> {
  type: TType;
  payload: TPayload;
}

// Granular effect types – these will wire into concrete systems

// Granular effect types – these will wire into concrete systems

export type ExecuteEnterActionsEffect = BaseRuntimeEffect<
  "EXECUTE_ENTER_ACTIONS",
  { itemId: string }
>;

export type ExecuteExitActionsEffect = BaseRuntimeEffect<
  "EXECUTE_EXIT_ACTIONS",
  { itemId: string }
>;

export type SwitchLayoutEffect = BaseRuntimeEffect<
  "SWITCH_LAYOUT",
  { layoutMode: LayoutMode }
>;

export type SwitchObsSceneEffect = BaseRuntimeEffect<
  "SWITCH_OBS_SCENE",
  {
    role: SceneRole;
    resolvedSceneName?: string | null;
  }
>;

export type ShowOverlayEffect = BaseRuntimeEffect<
  "SHOW_OVERLAY",
  {
    widgetId: string;
    action: "show" | "hide" | "toggle";
    payload?: any;
  }
>;

export type ControlComponentEffect = BaseRuntimeEffect<
  "CONTROL_COMPONENT",
  {
    target: ComponentActionTarget;
    operation: "show" | "hide" | "setProp" | "setState" | "dispatch";
    patchText?: string;
    event?: string;
    dataText?: string;
  }
>;

export type SendBotMessageEffect = BaseRuntimeEffect<
  "SEND_BOT_MESSAGE",
  {
    channelRole?: string;
    message: string;
  }
>;

export type PlaySoundEffect = BaseRuntimeEffect<
  "PLAY_SOUND",
  {
    soundId: string;
    volume?: number;
    duckOthers?: boolean;
  }
>;

/**
 * RawRuntimeEffect:
 * what the reducer emits internally – may include EXECUTE_* markers.
 */
export type RawRuntimeEffect =
  | ExecuteEnterActionsEffect
  | ExecuteExitActionsEffect
  | SwitchLayoutEffect
  | SwitchObsSceneEffect
  | ControlComponentEffect
  | ShowOverlayEffect
  | SendBotMessageEffect
  | PlaySoundEffect;

/**
 * RuntimeEffect:
 * what the UI / outside world sees after expansion – EXECUTE_* markers
 * should have been expanded away and never leak past the executor.
 */
export type RuntimeEffect =
  | SwitchLayoutEffect
  | SwitchObsSceneEffect
  | ControlComponentEffect
  | ShowOverlayEffect
  | SendBotMessageEffect
  | PlaySoundEffect;
