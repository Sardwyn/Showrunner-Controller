// src/App.tsx
import React, { useState, useMemo } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useLayout } from "./useLayout";
import { RundownEngineProvider } from "./rundown/runtime/RundownEngineProvider";
import {
  OBSConnectionProvider,
  useObsConnection,
} from "./hooks/useObsConnection";
import {
  TemplateManagerProvider,
  useTemplateManager,
} from "./rundown/templates/TemplateManagerProvider";
import TemplateSelector from "./components/TemplateSelector";
import {
  RoutingProfile,
  SceneRole,
  CANONICAL_SCENE_ROLES,
} from "./rundown/core/types";
import { getSceneRoleMeta } from "./rundown/core/sceneRoles";
import {
  loadRoutingProfile,
  saveRoutingProfile,
  createEmptyRoutingProfile,
} from "./rundown/routing/profileStorage";
import { StudioContextProvider } from "./runtime/StudioContext";
import { useScrapbotBridge } from "./runtime/useScrapbotBridge";
import { useRundownEventBridge } from "./runtime/useRundownEventBridge";
import { BridgeHost } from "./runtime/BridgeHost";
import { OverlayControlProvider } from "./runtime/OverlayControlContext";


// Panel components
import CameraPanel from "./components/CameraPanel";
import LightingPanel from "./components/LightingPanel";
import RundownPanel from "./components/RundownPanel.jsx";
import AudioPanel from "./components/AudioPanel";
import SequencePanel from "./components/SequencePanel";
import GlobalControls from "./components/GlobalControls";
import OBSScenePanel from "./components/OBSScenePanel";
import ConnectionStatusBar from "./components/ConnectionStatusBar";
import PreviewMonitor from "./components/PreviewMonitor";
import ComponentControlPanel from "./components/ComponentControlPanel";
import StudioClock from "./components/StudioClock";
import ScrapbotStatusPanel from "./components/ScrapbotStatusPanel";
import ChatPanel from "./components/ChatPanel";
import TransitionPanel from "./components/TransitionPanel";
import ProgramMonitor from "./components/ProgramMonitor";
import TeleprompterPanel from "./components/TeleprompterPanel";
import OverlayOperatorPanel from "./components/OverlayOperatorPanel";

// Debug

import DebugEventButton from "./components/DebugEventButton";
import DebugEventPanel from "./components/DebugEventPanel";


// Map panel IDs to components
const PANEL_REGISTRY = {
  programMonitor: ProgramMonitor,
  previewMonitor: PreviewMonitor,
  componentControls: ComponentControlPanel,
  obsScenes: OBSScenePanel,
  transition: TransitionPanel,
  overlayOperator: OverlayOperatorPanel,
  rundown: RundownPanel,
  camera: CameraPanel,
  lighting: LightingPanel,
  audio: AudioPanel,
  chat: ChatPanel,
  scrapbotStatus: ScrapbotStatusPanel,
  sequence: SequencePanel,
  teleprompter: TeleprompterPanel,
  debugEvents: DebugEventPanel,
};

type PanelId = keyof typeof PANEL_REGISTRY;
type PanelSize = "monitor" | "tall" | "default" | string | undefined;
type Zone = "left" | "center" | "right";

type PanelConfig = {
  panelId: PanelId;
  size?: PanelSize;
};

type ColumnProps = {
  zone: Zone;
  getPanelsForZone: (zone: Zone) => PanelConfig[] | any[];
};

const Column: React.FC<ColumnProps> = ({ zone, getPanelsForZone }) => {
  const rawPanels = getPanelsForZone(zone);
  const panels = rawPanels as PanelConfig[];

  return (
    <div className={`pc-column pc-column-${zone}`}>
      {panels.map(({ panelId, size }) => {
        const PanelComponent = PANEL_REGISTRY[panelId];
        if (!PanelComponent) return null;

        const sizeClass =
          size === "monitor"
            ? "pc-panel-monitor"
            : size === "tall"
            ? "pc-panel-tall"
            : "pc-panel-default";

        return (
          <motion.div
            key={panelId}
            layout
            layoutId={panelId}
            className={`pc-panel ${sizeClass}`}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 38,
              mass: 0.9,
            }}
          >
            <PanelComponent />
          </motion.div>
        );
      })}
    </div>
  );
};

type ControllerShellProps = {
  onOpenEditor: () => void;
  routingProfile: RoutingProfile;
};

const ControllerShell: React.FC<ControllerShellProps> = ({
  onOpenEditor,
  routingProfile,
}) => {
  const { mode, changeMode, getPanelsForZone, MODES } = useLayout();
  const [theme, setTheme] = useState("blue");
  const { activeTemplate } = useTemplateManager();

  const themes = [
    { id: "blue", label: "Studio Blue" },
    { id: "neon", label: "Neon" },
    { id: "spooktober", label: "Spooktober" },
    { id: "pipboy", label: "Pip-Boy" },
  ];

  if (!activeTemplate) {
    return <div className="pc-root">No rundown templates available.</div>;
  }

  return (
  <RundownEngineProvider
    key={activeTemplate.id}
    onLayoutModeChange={changeMode}
    templateOverride={activeTemplate}
    routingProfile={routingProfile}
  >
    {/* ✅ Bridges run inside RundownEngine + Studio context */}
    <BridgeHost />

    <OverlayControlProvider>
    <LayoutGroup id="production-controller-layout">
      <div className={`pc-root theme-${theme}`}>
        {/* Top status/header row */}
        <header className="pc-header">
          <div className="pc-header-left">
            <StudioClock />
            <ConnectionStatusBar />
          </div>

          <div className="pc-header-center">
            <GlobalControls />
            <TemplateSelector />
          </div>

          <div className="pc-header-right">
            {/* existing header bits, layout mode pills, etc. */}
            <DebugEventButton />
          </div>

          <div className="pc-header-right">
            {/* Theme chips */}
            <div className="pc-theme-toggle">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={theme === t.id ? "is-active" : ""}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Mode buttons */}
            <div className="pc-mode-toggle">
              <button
                className={mode === MODES.LIVE_GAMEPLAY ? "is-active" : ""}
                onClick={() => changeMode(MODES.LIVE_GAMEPLAY)}
              >
                Live Gameplay
              </button>
              <button
                className={mode === MODES.AD_READ ? "is-active" : ""}
                onClick={() => changeMode(MODES.AD_READ)}
              >
                Ad Read
              </button>
              <button
                className={mode === MODES.BRB ? "is-active" : ""}
                onClick={() => changeMode(MODES.BRB)}
              >
                BRB
              </button>
            </div>

            {/* Editor gateway */}
            <div className="pc-editor-toggle">
              <button
                type="button"
                className="pc-editor-button"
                onClick={onOpenEditor}
              >
                Edit Rundown
              </button>
            </div>
          </div>
        </header>

        {/* Main 3-column layout */}
        <main className="pc-layout">
          <Column zone="left" getPanelsForZone={getPanelsForZone} />
          <Column zone="center" getPanelsForZone={getPanelsForZone} />
          <Column zone="right" getPanelsForZone={getPanelsForZone} />
        </main>
      </div>
    </LayoutGroup>
    </OverlayControlProvider>
  </RundownEngineProvider>
);

};

type EditorOverlayProps = {
  onClose: () => void;
  routingProfile: RoutingProfile;
  onRoutingProfileChange: (profile: RoutingProfile) => void;
};

const CARD_TEMPLATES = [
  { type: "segment", label: "Segment", defaultDuration: 120 },
  { type: "ad", label: "Ad Break", defaultDuration: 30 },
  { type: "break", label: "Break / BRB", defaultDuration: 60 },
  { type: "vt", label: "VT / Video", defaultDuration: 90 },
  { type: "chat", label: "Chat Card", defaultDuration: 45 },
  { type: "event", label: "Event Trigger", defaultDuration: 10 },
];

type ItemTimingMap = Record<string, { start: number; end: number }>;
type GroupTotalsMap = Record<string, number>;

type ActionKind =
  | "obsScene"
  | "layout"
  | "component"
  | "widgetOverlay"
  | "botMessage"
  | "sound";

// When the card fires
type ActionPhase = "enter" | "exit" | "both";

type ItemAction = {
  id: string;
  kind: ActionKind;
  phase: ActionPhase;
  label?: string;
  config: Record<string, any>;
};

type DragItem =
  | { type: "group"; groupId: string }
  | { type: "item"; groupId: string; itemId: string };

function computeTemplateTiming(
  groups: any[],
  items: Record<string, any>
): { itemTimings: ItemTimingMap; groupTotals: GroupTotalsMap; total: number } {
  const itemTimings: ItemTimingMap = {};
  const groupTotals: GroupTotalsMap = {};
  let running = 0;

  for (const g of groups) {
    let groupTotal = 0;
    const itemIds: string[] = g.itemIds || [];

    for (const itemId of itemIds) {
      const card = items[itemId];
      if (!card) continue;

      const dur =
        typeof card.duration === "number" && !Number.isNaN(card.duration)
          ? card.duration
          : 0;

      itemTimings[itemId] = {
        start: running,
        end: running + dur,
      };

      running += dur;
      groupTotal += dur;
    }

    groupTotals[g.id] = groupTotal;
  }

  return { itemTimings, groupTotals, total: running };
}

function formatTimeLabel(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const EditorOverlay: React.FC<EditorOverlayProps> = ({
  onClose,
  routingProfile,
  onRoutingProfileChange,
}) => {
  const { activeTemplate, updateTemplate } = useTemplateManager();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // DnD state
  const [dragItem, setDragItem] = useState<DragItem | null>(null);

  // Use the same OBS hook as OBSScenePanel
  const obs = useObsConnection() as {
    scenes?: { name?: string; sceneName?: string }[];
  };

  // Scene routing panel open/closed
  const [isRoutingOpen, setIsRoutingOpen] = useState<boolean>(() => {
    const totalRoles = CANONICAL_SCENE_ROLES.length;
    const mappedCount = CANONICAL_SCENE_ROLES.filter(
      (role) => !!routingProfile.roleMap[role]
    ).length;
    // Default: open if not all roles are mapped
    return mappedCount < totalRoles;
  });

  const obsScenesRaw =
    (obs?.scenes ?? []) as { name?: string; sceneName?: string }[];

  // Normalise into [{ name }] so the rest of the code can stay as-is
  const obsScenes: { name: string }[] = useMemo(
    () =>
      obsScenesRaw
        .map((s: { name?: string; sceneName?: string }) => ({
          name: (s.name ?? s.sceneName ?? "").toString(),
        }))
        .filter((s: { name: string }) => s.name.length > 0),
    [obsScenesRaw]
  );

  if (!activeTemplate) {
    return null;
  }

  const groups = (activeTemplate.groups ?? []) as any[];
  const items = (activeTemplate.items ?? {}) as Record<string, any>;

  const { itemTimings, groupTotals, total } = useMemo(
    () => computeTemplateTiming(groups, items),
    [groups, items]
  );

  const selectedItem =
    selectedItemId && items[selectedItemId] ? items[selectedItemId] : null;

  const selectedGroup =
    selectedGroupId && groups.length
      ? groups.find((g) => g.id === selectedGroupId) || null
      : null;

  // --- GROUP ACTIONS ---

  const handleAddGroup = () => {
    const newGroupId = `group_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const nextGroups = [
      ...groups,
      {
        id: newGroupId,
        title: "New Group",
        itemIds: [],
      },
    ];

    updateTemplate(activeTemplate.id, {
      groups: nextGroups,
    });

    setSelectedGroupId(newGroupId);
    setSelectedItemId(null);
  };

  const handleGroupTitleChange = (value: string) => {
    if (!selectedGroupId) return;

    const nextGroups = groups.map((g) =>
      g.id === selectedGroupId ? { ...g, title: value } : g
    );

    updateTemplate(activeTemplate.id, { groups: nextGroups });
  };

  const handleMoveGroup = (direction: "up" | "down") => {
    if (!selectedGroupId) return;

    const index = groups.findIndex((g) => g.id === selectedGroupId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;

    const nextGroups = [...groups];
    const [removed] = nextGroups.splice(index, 1);
    nextGroups.splice(targetIndex, 0, removed);

    updateTemplate(activeTemplate.id, { groups: nextGroups });
  };

  const handleDeleteGroup = () => {
    if (!selectedGroupId) return;
    if (groups.length <= 1) return;

    const index = groups.findIndex((g) => g.id === selectedGroupId);
    if (index === -1) return;

    const groupToDelete = groups[index];
    const itemIdsToRemove = new Set(groupToDelete.itemIds || []);

    const nextGroups = groups.filter((g) => g.id !== selectedGroupId);

    const nextItems: Record<string, any> = {};
    for (const [id, card] of Object.entries(items)) {
      if (!itemIdsToRemove.has(id)) {
        nextItems[id] = card;
      }
    }

    updateTemplate(activeTemplate.id, {
      groups: nextGroups,
      items: nextItems,
    });

    setSelectedItemId(null);

    const fallbackIndex =
      index >= nextGroups.length ? nextGroups.length - 1 : index;
    const fallbackGroup =
      fallbackIndex >= 0 ? nextGroups[fallbackIndex] : null;

    setSelectedGroupId(fallbackGroup ? fallbackGroup.id : null);
  };

  // --- CARD ACTIONS ---

  const handleAddCard = (baseType: string) => {
    if (!groups.length) return;

    const targetGroupId =
      selectedGroupId || (groups[0] && groups[0].id) || null;
    if (!targetGroupId) return;

    const preset = CARD_TEMPLATES.find((c) => c.type === baseType);
    const newId = `item_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const newItem = {
      id: newId,
      title: preset?.label || "New Item",
      type: baseType,
      duration: preset?.defaultDuration ?? 60,
      trigger: { mode: "manual" },
      behaviour: { priority: 0, autoConfirm: false },
      actions: [],
      metadata: {},
    };

    const nextItems = {
      ...items,
      [newId]: newItem,
    };

    const nextGroups = groups.map((g) =>
      g.id === targetGroupId
        ? {
            ...g,
            itemIds: [...(g.itemIds || []), newId],
          }
        : g
    );

    updateTemplate(activeTemplate.id, {
      items: nextItems,
      groups: nextGroups,
    });

    setSelectedItemId(newId);
    setSelectedGroupId(targetGroupId);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedItemId(null);
  };

  const handleSelectItem = (groupId: string, itemId: string) => {
    setSelectedGroupId(groupId);
    setSelectedItemId(itemId);
  };

  const handleTemplateTitleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateTemplate(activeTemplate.id, { title: e.target.value });
  };

  const handleItemFieldChange = (
    field: "title" | "type" | "duration",
    value: string
  ) => {
    if (!selectedItemId) return;
    const current = items[selectedItemId] || {};
    const nextItems = {
      ...items,
      [selectedItemId]: {
        ...current,
        [field]: field === "duration" ? Number(value) || 0 : value,
      },
    };
    updateTemplate(activeTemplate.id, { items: nextItems });
  };

  // Move selected card up/down within its group (via buttons)
  const handleMoveItem = (direction: "up" | "down") => {
    if (!selectedItemId || !selectedGroupId) return;

    const groupIndex = groups.findIndex((g) => g.id === selectedGroupId);
    if (groupIndex === -1) return;

    const group = groups[groupIndex];
       const itemIds: string[] = group.itemIds || [];
    const index = itemIds.indexOf(selectedItemId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= itemIds.length) return;

    const newItemIds = [...itemIds];
    const [removed] = newItemIds.splice(index, 1);
    newItemIds.splice(targetIndex, 0, removed);

    const nextGroups = groups.map((g, idx) =>
      idx === groupIndex ? { ...g, itemIds: newItemIds } : g
    );

    updateTemplate(activeTemplate.id, { groups: nextGroups });
  };

  // Delete selected card
  const handleDeleteItem = () => {
    if (!selectedItemId || !selectedGroupId) return;

    const groupIndex = groups.findIndex((g) => g.id === selectedGroupId);
    if (groupIndex === -1) return;

    const group = groups[groupIndex];
    const itemIds: string[] = group.itemIds || [];
    const index = itemIds.indexOf(selectedItemId);
    if (index === -1) return;

    const newItemIds = itemIds.filter((id) => id !== selectedItemId);

    const { [selectedItemId]: _discard, ...nextItems } = items;

    const nextGroups = groups.map((g, idx) =>
      idx === groupIndex ? { ...g, itemIds: newItemIds } : g
    );

    updateTemplate(activeTemplate.id, {
      groups: nextGroups,
      items: nextItems,
    });

    let nextSelectedItemId: string | null = null;
    if (newItemIds.length > 0) {
      const fallbackIndex =
        index >= newItemIds.length ? newItemIds.length - 1 : index;
      nextSelectedItemId = newItemIds[fallbackIndex];
    }

    setSelectedItemId(nextSelectedItemId);
  };

  // --- DRAG & DROP HELPERS ---

  const handleGroupDragStart = (groupId: string) => {
    setDragItem({ type: "group", groupId });
  };

  const handleGroupDrop = (targetGroupId: string) => {
    if (!dragItem || dragItem.type !== "group") return;
    const sourceGroupId = dragItem.groupId;
    if (sourceGroupId === targetGroupId) return;

    const fromIndex = groups.findIndex((g) => g.id === sourceGroupId);
    const toIndex = groups.findIndex((g) => g.id === targetGroupId);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextGroups = [...groups];
    const [moved] = nextGroups.splice(fromIndex, 1);
    nextGroups.splice(toIndex, 0, moved);

    updateTemplate(activeTemplate.id, { groups: nextGroups });
    setDragItem(null);
    setSelectedGroupId(targetGroupId);
  };

  const handleItemDragStart = (groupId: string, itemId: string) => {
    setDragItem({ type: "item", groupId, itemId });
  };

  const handleItemDrop = (targetGroupId: string, targetItemId: string | null) => {
    if (!dragItem || dragItem.type !== "item") return;

    const { groupId: sourceGroupId, itemId } = dragItem;

    const sourceGroupIndex = groups.findIndex((g) => g.id === sourceGroupId);
    const targetGroupIndex = groups.findIndex((g) => g.id === targetGroupId);
    if (sourceGroupIndex === -1 || targetGroupIndex === -1) return;

    const sourceGroup = groups[sourceGroupIndex];
    const targetGroup = groups[targetGroupIndex];

    const sourceItemIds = [...(sourceGroup.itemIds || [])];
    const fromIndex = sourceItemIds.indexOf(itemId);
    if (fromIndex === -1) return;

    const sameGroup = sourceGroupId === targetGroupId;

    let nextGroups = groups;

    if (sameGroup) {
      // Reorder within the same group
      const newIds = [...sourceItemIds];
      const [removedId] = newIds.splice(fromIndex, 1);

      if (targetItemId === null) {
        // Drop to end
        newIds.push(removedId);
      } else {
        let toIndex = newIds.indexOf(targetItemId);
        if (toIndex === -1) {
          newIds.push(removedId);
        } else {
          newIds.splice(toIndex, 0, removedId);
        }
      }

      const updatedGroup = { ...sourceGroup, itemIds: newIds };
      nextGroups = groups.map((g) =>
        g.id === sourceGroupId ? updatedGroup : g
      );
    } else {
      // Move between groups
      const newSourceIds = [...sourceItemIds];
      newSourceIds.splice(fromIndex, 1);

      const targetItemIds = [...(targetGroup.itemIds || [])];
      let toIndex =
        targetItemId !== null ? targetItemIds.indexOf(targetItemId) : -1;
      if (toIndex === -1) {
        toIndex = targetItemIds.length;
      }
      targetItemIds.splice(toIndex, 0, itemId);

      const updatedSource = { ...sourceGroup, itemIds: newSourceIds };
      const updatedTarget = { ...targetGroup, itemIds: targetItemIds };

      nextGroups = groups.map((g) => {
        if (g.id === sourceGroupId) return updatedSource;
        if (g.id === targetGroupId) return updatedTarget;
        return g;
      });
    }

    updateTemplate(activeTemplate.id, { groups: nextGroups });
    setDragItem(null);
    setSelectedGroupId(targetGroupId);
    setSelectedItemId(itemId);
  };

  // --- ACTIONS EDITOR HELPERS ---

  const currentActions: ItemAction[] =
    (selectedItem?.actions as ItemAction[]) || [];

  const updateActions = (nextActions: ItemAction[]) => {
    if (!selectedItemId) return;
    const current = items[selectedItemId] || {};
    const nextItems = {
      ...items,
      [selectedItemId]: {
        ...current,
        actions: nextActions,
      },
    };
    updateTemplate(activeTemplate.id, { items: nextItems });
  };

  const handleActionPhaseChange = (actionId: string, phase: ActionPhase) => {
    const nextActions: ItemAction[] = currentActions.map((a) =>
      a.id === actionId ? { ...a, phase } : a
    );
    updateActions(nextActions);
  };

  const handleAddAction = (kind: ActionKind) => {
    if (!selectedItemId) return;

    const id = `act_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    let config: Record<string, any> = {};
    switch (kind) {
      case "obsScene":
        config = { role: "" as SceneRole };
        break;
      case "layout":
        config = { layoutMode: "" };
        break;
      case "widgetOverlay":
        config = { widgetId: "", action: "show", payload: undefined };
        break;
      case "component":
        config = {
          target: {
            kind: "native",
            tenantId: "",
            overlayPublicId: "",
            componentInstanceId: "",
            widgetType: "",
            widgetId: "",
          },
          operation: "show",
          patchText: "{}",
          event: "",
          dataText: "{}",
        };
        break;
      case "botMessage":
        config = { channelRole: "", message: "" };
        break;
      case "sound":
        config = { soundId: "", volume: 1, duckOthers: false };
        break;
    }

    const nextActions: ItemAction[] = [
      ...currentActions,
      {
        id,
        kind,
        phase: "enter",
        label: "",
        config,
      },
    ];

    updateActions(nextActions);
  };

  const handleActionLabelChange = (actionId: string, value: string) => {
    const nextActions = currentActions.map((a) =>
      a.id === actionId ? { ...a, label: value } : a
    );
    updateActions(nextActions);
  };

  const handleActionKindChange = (actionId: string, kind: ActionKind) => {
    const nextActions: ItemAction[] = currentActions.map((a) => {
      if (a.id !== actionId) return a;

      let config: Record<string, any> = {};
      switch (kind) {
        case "obsScene":
          config = { role: "" as SceneRole };
          break;
        case "layout":
          config = { layoutMode: "" };
          break;
        case "widgetOverlay":
          config = { widgetId: "", action: "show", payload: undefined };
          break;
        case "component":
          config = {
            target: {
              kind: "native",
              tenantId: "",
              overlayPublicId: "",
              componentInstanceId: "",
              widgetType: "",
              widgetId: "",
            },
            operation: "show",
            patchText: "{}",
            event: "",
            dataText: "{}",
          };
          break;
        case "botMessage":
          config = { channelRole: "", message: "" };
          break;
        case "sound":
          config = { soundId: "", volume: 1, duckOthers: false };
          break;
      }

      return { ...a, kind, config };
    });

    updateActions(nextActions);
  };

  const handleActionConfigChange = (
    actionId: string,
    key: string,
    value: any
  ) => {
    const nextActions = currentActions.map((a) =>
      a.id === actionId
        ? { ...a, config: { ...a.config, [key]: value } }
        : a
    );
    updateActions(nextActions);
  };

  const handleDeleteAction = (actionId: string) => {
    const nextActions = currentActions.filter((a) => a.id !== actionId);
    updateActions(nextActions);
  };

  const getActionTargetKey = (
    kind: ActionKind
  ): { key: string; label: string } => {
    switch (kind) {
      case "obsScene":
        return { key: "role", label: "Scene role" };
      case "layout":
        return { key: "layoutMode", label: "Layout mode" };
      case "widgetOverlay":
        return { key: "widgetId", label: "Widget ID" };
      case "component":
        return { key: "overlayPublicId", label: "Overlay Public ID" };
      case "botMessage":
        return { key: "message", label: "Message" };
      case "sound":
        return { key: "soundId", label: "Sound key" };
      default:
        return { key: "target", label: "Target" };
    }
  };

  // --- ROUTING EDITOR ---

  const obsSceneNames = new Set<string>(
    obsScenes.map((s: { name: string }) => s.name)
  );

  const totalRoles = CANONICAL_SCENE_ROLES.length;
  const mappedCount = CANONICAL_SCENE_ROLES.filter(
    (role: SceneRole) => !!routingProfile.roleMap[role]
  ).length;

  const unresolvedRoles: SceneRole[] = CANONICAL_SCENE_ROLES.filter(
    (role: SceneRole) =>
      routingProfile.roleMap[role] &&
      !obsSceneNames.has(routingProfile.roleMap[role]!)
  );

  const routingSummary =
    mappedCount === 0
      ? "No roles mapped"
      : mappedCount === totalRoles
      ? "All roles mapped"
      : `${mappedCount}/${totalRoles} mapped`;

  const handleSceneRoleChange = (role: SceneRole, sceneName: string) => {
    const nextProfile: RoutingProfile = {
      ...routingProfile,
      roleMap: {
        ...routingProfile.roleMap,
        [role]: sceneName || undefined,
      } as any,
      metadata: {
        ...(routingProfile.metadata || {}),
        updatedAt: Date.now(),
      },
    };
    onRoutingProfileChange(nextProfile);
  };

  // helpers for group inspector buttons
  const selectedGroupIndex =
    selectedGroupId && groups.length
      ? groups.findIndex((g) => g.id === selectedGroupId)
      : -1;

  const isFirstGroup = selectedGroupIndex === 0;
  const isLastGroup =
    selectedGroupIndex === groups.length - 1 && selectedGroupIndex !== -1;

  // helpers for item inspector buttons
  const currentItemGroup =
    selectedItemId && selectedGroupId
      ? groups.find((g) => g.id === selectedGroupId) || null
      : null;

  const currentItemIndex =
    currentItemGroup && selectedItemId
      ? (currentItemGroup.itemIds || []).indexOf(selectedItemId)
      : -1;

  const isFirstItem = currentItemIndex === 0;
  const isLastItem =
    currentItemGroup &&
    currentItemIndex === (currentItemGroup.itemIds || []).length - 1 &&
    currentItemIndex !== -1;

  return (
    <div className="pc-editor-overlay">
      {/* Backdrop */}
      <div className="pc-editor-backdrop" onClick={onClose} />

      {/* Sliding panel */}
      <motion.div
        className="pc-editor-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <header className="pc-editor-header">
          <div className="pc-editor-title">
            <h2>Rundown Editor</h2>
            <div className="pc-editor-subtitle">
              <input
                type="text"
                value={activeTemplate.title || ""}
                onChange={handleTemplateTitleChange}
                className="pc-editor-title-input"
              />
            </div>
          </div>
          <div className="pc-editor-header-actions">
            <button
              type="button"
              className="pc-editor-close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="pc-editor-body">
          {/* LEFT: Palette */}
          <div className="pc-editor-pane pc-editor-pane-palette">
            <div className="pc-editor-palette-section pc-editor-palette-section-cards">
              <h4>Card Palette</h4>
              <div className="pc-editor-palette-list">
                {CARD_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.type}
                    type="button"
                    className={`pc-editor-palette-card pc-editor-type-${tpl.type}`}
                    onClick={() => handleAddCard(tpl.type)}
                  >
                    <div className="pc-editor-palette-label">
                      {tpl.label}
                    </div>
                    <div className="pc-editor-palette-meta">
                      Default {tpl.defaultDuration}s
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div className="pc-editor-pane pc-editor-pane-canvas">
            <div className="pc-editor-canvas-header">
              <div className="pc-editor-canvas-title">Rundown Structure</div>
              <div className="pc-editor-canvas-total">
                Show time total:{" "}
                <span className="pc-editor-canvas-total-value">
                  {formatTimeLabel(total)}
                </span>
              </div>
            </div>

            <div className="pc-editor-canvas-groups">
              {groups.map((g) => {
                const isActiveGroup = selectedGroupId === g.id;
                const itemIds = g.itemIds || [];
                const groupTotal = groupTotals[g.id] ?? 0;

                return (
                  <div
                    key={g.id}
                    className={
                      "pc-editor-group" + (isActiveGroup ? " is-active" : "")
                    }
                  >
                    {/* Group header is draggable and a drop target for other groups */}
                    <div
                      className="pc-editor-group-header"
                      onClick={() => handleSelectGroup(g.id)}
                      draggable
                      onDragStart={() => handleGroupDragStart(g.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleGroupDrop(g.id);
                      }}
                    >
                      <div className="pc-editor-group-title">
                        {g.title || "Untitled Group"}
                      </div>
                      <div className="pc-editor-group-count">
                        {itemIds.length} item
                        {itemIds.length === 1 ? "" : "s"} ·{" "}
                        {formatTimeLabel(groupTotal)}
                      </div>
                    </div>

                    {/* Group items area: drop target for cards */}
                    <div
                      className="pc-editor-group-items"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        // Drop card into end of this group
                        handleItemDrop(g.id, null);
                      }}
                    >
                      {itemIds.map((itemId: string) => {
                        const card = items[itemId];
                        if (!card) return null;

                        const isSelected = selectedItemId === itemId;
                        const timing = itemTimings[itemId];

                        return (
                          <div
                            key={itemId}
                            className={
                              "pc-editor-item-row" +
                              (isSelected ? " is-selected" : "")
                            }
                            onClick={() => handleSelectItem(g.id, itemId)}
                            draggable
                            onDragStart={() =>
                              handleItemDragStart(g.id, itemId)
                            }
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              // Drop before this item in this group
                              handleItemDrop(g.id, itemId);
                            }}
                          >
                            {/* TIME LABEL COLUMN */}
                            <div className="pc-editor-time-label-cell">
                              {timing ? formatTimeLabel(timing.start) : ""}
                            </div>

                            {/* LINE + DOT COLUMN */}
                            <div className="pc-editor-time-line-cell">
                              <div className="pc-editor-time-dot" />
                            </div>

                            {/* CARD COLUMN */}
                            <div className="pc-editor-item-card">
                              <div className="pc-editor-item-title">
                                {card.title || "Untitled"}
                              </div>
                              <div className="pc-editor-item-meta">
                                <span className="pc-editor-item-type">
                                  {card.type || "segment"}
                                </span>
                                {typeof card.duration === "number" && (
                                  <span className="pc-editor-item-duration">
                                    {card.duration}s
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ADD GROUP CARD */}
              <div
                className="pc-editor-group pc-editor-group-add"
                onClick={handleAddGroup}
              >
                <div className="pc-editor-group-header pc-editor-group-add-header">
                  <div className="pc-editor-group-add-label">+ Add Group</div>
                  <div className="pc-editor-group-add-subtitle">
                    Create a new block in the rundown
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Inspector */}
          <div className="pc-editor-pane pc-editor-pane-inspector">
            <h4>Inspector</h4>

            {/* SCENE ROUTING – collapsible */}
            <div className="pc-inspector-panel pc-inspector-panel-routing">
              <button
                type="button"
                className="pc-routing-header"
                onClick={() => setIsRoutingOpen((open) => !open)}
              >
                <div className="pc-routing-header-left">
                  <span
                    className={
                      "pc-routing-chevron " +
                      (isRoutingOpen ? "is-open" : "is-closed")
                    }
                  >
                    ▸
                  </span>
                  <div className="pc-inspector-panel-title">Scene Routing</div>
                </div>
                <div className="pc-routing-header-right">
                  <span className="pc-routing-summary">{routingSummary}</span>
                </div>
              </button>

              {isRoutingOpen && (
                <div className="pc-editor-routing-section">
                  {obsScenes.length === 0 && (
                    <div className="pc-routing-warning">
                      No scenes loaded from OBS. Check OBS connection.
                    </div>
                  )}

                  <table className="pc-scene-routing-table">
  <thead>
    <tr>
      <th>Role</th>
      <th>OBS Scene</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {CANONICAL_SCENE_ROLES.map((role: SceneRole) => {
      const meta = getSceneRoleMeta(role);
      const mappedScene = routingProfile.roleMap[role] ?? "";
      const isMapped = mappedScene !== "";
      const existsInObs = isMapped && obsSceneNames.has(mappedScene);

      let statusClass = "pc-routing-status-unmapped";
      if (isMapped && existsInObs) statusClass = "pc-routing-status-ok";
      if (isMapped && !existsInObs) statusClass = "pc-routing-status-missing";

      return (
        <tr key={role}>
          <td>
            {/* ROLE TEXT ONLY — no icon */}
            <span className="pc-role-label">{meta.label}</span>
          </td>

          <td>
            <select
              value={mappedScene}
              onChange={(e) =>
                handleSceneRoleChange(role, e.target.value)
              }
              disabled={obsScenes.length === 0}
            >
              <option value="">(Unmapped)</option>
              {obsScenes.map((scene: { name: string }) => (
                <option key={scene.name} value={scene.name}>
                  {scene.name}
                </option>
              ))}
            </select>
          </td>

          <td>
            <span className={`pc-routing-status-dot ${statusClass}`} />
          </td>
        </tr>
      );
    })}
  </tbody>
</table>


                  {unresolvedRoles.length > 0 && (
                    <div className="pc-routing-warning">
                      Some roles are mapped to scenes that no longer exist in
                      OBS.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ITEM SELECTED */}
            {selectedItem && (
              <>
                {/* Card details panel */}
                <div className="pc-inspector-panel">
                  <h5>Card Details</h5>

                  <div className="pc-inspector-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={selectedItem.title || ""}
                      onChange={(e) =>
                        handleItemFieldChange("title", e.target.value)
                      }
                    />
                  </div>

                  <div className="pc-inspector-field">
                    <label>Type</label>
                    <input
                      type="text"
                      value={selectedItem.type || ""}
                      onChange={(e) =>
                        handleItemFieldChange("type", e.target.value)
                      }
                    />
                  </div>

                  <div className="pc-inspector-field">
                    <label>Duration (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedItem.duration || 0}
                      onChange={(e) =>
                        handleItemFieldChange("duration", e.target.value)
                      }
                    />
                  </div>

                  <div className="pc-inspector-move-btns">
                    <button
                      type="button"
                      onClick={() => handleMoveItem("up")}
                      disabled={isFirstItem}
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveItem("down")}
                      disabled={isLastItem}
                    >
                      Move Down
                    </button>
                  </div>

                  <button
                    type="button"
                    className="pc-inspector-delete-btn"
                    onClick={handleDeleteItem}
                  >
                    Delete Card
                  </button>
                </div>

                {/* Actions panel */}
                <div className="pc-inspector-panel pc-actions-block">
                  <h5>Actions</h5>

                  {currentActions.length === 0 && (
                    <div className="pc-actions-empty">
                      No actions configured for this card.
                    </div>
                  )}

                  {currentActions.map((action) => {
                    const targetMeta = getActionTargetKey(action.kind);
                    const targetValue =
                      (action.config && action.config[targetMeta.key]) || "";

                    return (
                      <div key={action.id} className="pc-action-row">
                        <div className="pc-action-inner">
                          <div className="pc-inspector-field">
                            <label>Phase</label>
                            <select
                              value={action.phase || "enter"}
                              onChange={(e) =>
                                handleActionPhaseChange(
                                  action.id,
                                  e.target.value as ActionPhase
                                )
                              }
                            >
                              <option value="enter">On Enter</option>
                              <option value="exit">On Exit</option>
                              <option value="both">Both</option>
                            </select>
                          </div>

                          <div className="pc-inspector-field">
                            <label>Kind</label>
                            <select
                              value={action.kind}
                              onChange={(e) =>
                                handleActionKindChange(
                                  action.id,
                                  e.target.value as ActionKind
                                )
                              }
                            >
                              <option value="obsScene">OBS Scene</option>
                              <option value="layout">Layout</option>
                              <option value="component">Component</option>
                              <option value="widgetOverlay">Overlay</option>
                              <option value="botMessage">Bot Message</option>
                              <option value="sound">Sound</option>
                            </select>
                          </div>

                          <div className="pc-inspector-field">
                            <label>Label (optional)</label>
                            <input
                              type="text"
                              value={action.label || ""}
                              onChange={(e) =>
                                handleActionLabelChange(
                                  action.id,
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="pc-inspector-field">
                            {action.kind === "obsScene" ? (
                              <>
                                <label>Scene role</label>
                                <select
                                  value={
                                    (action.config.role as SceneRole) ?? ""
                                  }
                                  onChange={(e) =>
                                    handleActionConfigChange(
                                      action.id,
                                      "role",
                                      e.target.value as SceneRole
                                    )
                                  }
                                >
                                  <option value="">(Unassigned)</option>
                                  {CANONICAL_SCENE_ROLES.map(
                                    (role: SceneRole) => {
                                      const meta = getSceneRoleMeta(role);
                                      return (
                                        <option key={role} value={role}>
                                          {meta.icon} {meta.label}
                                        </option>
                                      );
                                    }
                                  )}
                                </select>
                              </>
                            ) : action.kind === "component" ? (
                              <>
                                <label>Target kind</label>
                                <select
                                  value={action.config?.target?.kind || "native"}
                                  onChange={(e) =>
                                    handleActionConfigChange(
                                      action.id,
                                      "target",
                                      {
                                        ...(action.config?.target || {}),
                                        kind: e.target.value,
                                      } as any
                                    )
                                  }
                                >
                                  <option value="native">Native Component</option>
                                  <option value="widget">Widget Adapter</option>
                                </select>

                                <label>Tenant ID</label>
                                <input
                                  type="text"
                                  value={action.config?.target?.tenantId || ""}
                                  onChange={(e) =>
                                    handleActionConfigChange(action.id, "target", {
                                      ...(action.config?.target || {}),
                                      tenantId: e.target.value,
                                    } as any)
                                  }
                                />

                                <label>Overlay Public ID</label>
                                <input
                                  type="text"
                                  value={action.config?.target?.overlayPublicId || ""}
                                  onChange={(e) =>
                                    handleActionConfigChange(action.id, "target", {
                                      ...(action.config?.target || {}),
                                      overlayPublicId: e.target.value,
                                    } as any)
                                  }
                                />

                                {action.config?.target?.kind === "native" ? (
                                  <>
                                    <label>Component Instance ID</label>
                                    <input
                                      type="text"
                                      value={action.config?.target?.componentInstanceId || ""}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "target", {
                                          ...(action.config?.target || {}),
                                          componentInstanceId: e.target.value,
                                        } as any)
                                      }
                                    />
                                  </>
                                ) : (
                                  <>
                                    <label>Widget Type</label>
                                    <input
                                      type="text"
                                      value={action.config?.target?.widgetType || ""}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "target", {
                                          ...(action.config?.target || {}),
                                          widgetType: e.target.value,
                                        } as any)
                                      }
                                    />
                                    <label>Widget ID</label>
                                    <input
                                      type="text"
                                      value={action.config?.target?.widgetId || ""}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "target", {
                                          ...(action.config?.target || {}),
                                          widgetId: e.target.value,
                                        } as any)
                                      }
                                    />
                                  </>
                                )}

                                <label>Operation</label>
                                <select
                                  value={action.config?.operation || "show"}
                                  onChange={(e) =>
                                    handleActionConfigChange(action.id, "operation", e.target.value)
                                  }
                                >
                                  <option value="show">Show</option>
                                  <option value="hide">Hide</option>
                                  <option value="setProp">Set Prop</option>
                                  <option value="setState">Set State</option>
                                  <option value="dispatch">Dispatch</option>
                                </select>

                                {(action.config?.operation === "setProp" ||
                                  action.config?.operation === "setState") && (
                                  <>
                                    <label>Patch JSON</label>
                                    <textarea
                                      value={action.config?.patchText || "{}"}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "patchText", e.target.value)
                                      }
                                    />
                                  </>
                                )}

                                {action.config?.operation === "dispatch" && (
                                  <>
                                    <label>Event</label>
                                    <input
                                      type="text"
                                      value={action.config?.event || ""}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "event", e.target.value)
                                      }
                                    />
                                    <label>Data JSON</label>
                                    <textarea
                                      value={action.config?.dataText || "{}"}
                                      onChange={(e) =>
                                        handleActionConfigChange(action.id, "dataText", e.target.value)
                                      }
                                    />
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <label>{targetMeta.label}</label>
                                <input
                                  type="text"
                                  value={targetValue}
                                  onChange={(e) =>
                                    handleActionConfigChange(
                                      action.id,
                                      targetMeta.key,
                                      e.target.value
                                    )
                                  }
                                />
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="pc-action-delete"
                          onClick={() => handleDeleteAction(action.id)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  <div className="pc-actions-add">
                    <div className="pc-actions-add-title">Add action:</div>
                    <div className="pc-actions-add-grid">
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("obsScene")}
                      >
                        OBS Scene
                      </button>
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("layout")}
                      >
                        Layout
                      </button>
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("component")}
                      >
                        Component
                      </button>
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("widgetOverlay")}
                      >
                        Overlay
                      </button>
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("botMessage")}
                      >
                        Bot Message
                      </button>
                      <button
                        type="button"
                        className="pc-action-add-button"
                        onClick={() => handleAddAction("sound")}
                      >
                        Sound
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GROUP SELECTED, NO ITEM */}
            {!selectedItem && selectedGroup && (
              <div className="pc-inspector-panel">
                <h5>Group Details</h5>

                <div className="pc-inspector-field">
                  <label>Group title</label>
                  <input
                    type="text"
                    value={selectedGroup.title || ""}
                    onChange={(e) => handleGroupTitleChange(e.target.value)}
                  />
                </div>

                <div className="pc-inspector-move-btns">
                  <button
                    type="button"
                    onClick={() => handleMoveGroup("up")}
                    disabled={isFirstGroup}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveGroup("down")}
                    disabled={isLastGroup}
                  >
                    Move Down
                  </button>
                </div>

                <button
                  type="button"
                  className="pc-inspector-delete-btn"
                  onClick={handleDeleteGroup}
                  disabled={groups.length <= 1}
                >
                  Delete Group
                </button>
              </div>
            )}

            {/* EMPTY STATE */}
            {!selectedItem && !selectedGroup && (
              <div className="pc-editor-inspector-empty">
                Select a group or card to edit its details.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>(() => {
    return loadRoutingProfile() ?? createEmptyRoutingProfile();
  });

  const handleRoutingProfileChange = (profile: RoutingProfile) => {
    setRoutingProfile(profile);
    saveRoutingProfile(profile);
  };

  return (
    <StudioContextProvider>
      <TemplateManagerProvider>
        <OBSConnectionProvider>
          <div className="pc-root-shell">
            <ControllerShell
              onOpenEditor={() => setEditorOpen(true)}
              routingProfile={routingProfile}
            />
            {editorOpen && (
              <EditorOverlay
                onClose={() => setEditorOpen(false)}
                routingProfile={routingProfile}
                onRoutingProfileChange={handleRoutingProfileChange}
              />
            )}
          </div>
        </OBSConnectionProvider>
      </TemplateManagerProvider>
    </StudioContextProvider>
  );
}
