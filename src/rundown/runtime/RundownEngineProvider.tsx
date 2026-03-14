// src/rundown/runtime/RundownEngineProvider.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  LayoutMode,
  SceneRole,
  RoutingProfile,
  RundownTemplate,
} from "../core/types";
import {
  useRundownEngine,
  createDemoTemplate,
  UseRundownEngineResult,
  UseRundownEngineOptions,
} from "./useRundownEngine";
import { useObsConnection } from "../../hooks/useObsConnection";
import { sendComponentPacket } from "../../runtime/sendComponentPacket";

type RundownEngineContextValue = UseRundownEngineResult & {
  autoNext: boolean;
  toggleAutoNext: () => void;
};

const RundownEngineContext = createContext<RundownEngineContextValue | null>(
  null
);

type RundownEngineProviderProps = {
  children: ReactNode;
  routingProfile?: RoutingProfile | null;
  onLayoutModeChange?: (layoutMode: LayoutMode) => void;

  /**
   * If provided, this template is used as the source of truth for the show.
   * If omitted, we fall back to createDemoTemplate() for backwards compatibility.
   */
  templateOverride?: RundownTemplate | null;
};

export const RundownEngineProvider: React.FC<RundownEngineProviderProps> = ({
  children,
  routingProfile = null,
  onLayoutModeChange,
  templateOverride,
}) => {
  // Either use the externally supplied template (from TemplateManager)
  // or fall back to the old demo template.
  const template = useMemo(
    () => templateOverride ?? createDemoTemplate(),
    [templateOverride]
  );

  // OBS connection (typed defensively so TS doesn't freak out)
  type ObsConnectionShape = {
    setProgram?: (sceneName: string) => void;
  };

  const obsConnection = useObsConnection() as ObsConnectionShape;

  const engine = useRundownEngine(template, {
    routingProfile,
    onLayoutModeChange,
    onObsSceneChange: (role: SceneRole, sceneName: string | null) => {
      console.log("[RundownEngine] OBS scene change:", { role, sceneName });

      if (!sceneName) {
        console.warn("[RundownEngine] No resolved scene name for role:", role);
        return;
      }

      if (
        obsConnection &&
        typeof obsConnection.setProgram === "function"
      ) {
        try {
          obsConnection.setProgram(sceneName);
        } catch (err) {
          console.error("[RundownEngine] Failed to switch OBS scene:", err);
        }
      } else {
        console.warn(
          "[RundownEngine] setProgram not available on OBS connection"
        );
      }
    },
    onOverlayEffect: payload => {
      console.log("[RundownEngine] Overlay effect:", payload);
    },
    onComponentEffect: payload => {
      if (payload?.target?.kind !== "native") {
        console.warn("[RundownEngine] Widget adapter component effects are not wired in phase 1:", payload);
        return;
      }

      sendComponentPacket(payload.packet).catch((err) => {
        console.error("[RundownEngine] Failed to send component packet:", err);
      });
    },
    onBotMessage: payload => {
      console.log("[RundownEngine] Bot message:", payload);
    },
    onSound: payload => {
      console.log("[RundownEngine] Sound effect:", payload);
    },
  } as UseRundownEngineOptions);

  // --- Auto-next flag exposed to the UI ---
  const [autoNext, setAutoNext] = useState(false);
  const autoGuardRef = useRef(false);

  const toggleAutoNext = () => {
    setAutoNext(prev => !prev);
  };

  // Global rundown timer tick – drives card elapsed
  useEffect(() => {
    const interval = setInterval(() => {
      // 1 second tick; reducer will no-op if show hasn't started
      engine.tick(1);
    }, 1000);

    return () => clearInterval(interval);
  }, [engine]);

  // Auto-advance when the current item hits its duration and Auto is on
  useEffect(() => {
    if (!autoNext) {
      // Reset guard whenever auto is disabled
      autoGuardRef.current = false;
      return;
    }

    const current: any = engine.currentItem;

    if (!current) {
      autoGuardRef.current = false;
      return;
    }

    if (current.status !== "live") {
      // Only auto-advance live cards
      return;
    }

    const duration =
      typeof current.duration === "number" ? current.duration : null;
    const elapsed =
      typeof current.elapsed === "number" ? current.elapsed : 0;

    if (!duration) {
      // No duration → nothing to auto
      autoGuardRef.current = false;
      return;
    }

    // Before duration, clear guard so this card can fire once when it finishes
    if (elapsed < duration) {
      autoGuardRef.current = false;
      return;
    }

    // Already auto-advanced this card
    if (autoGuardRef.current) return;

    autoGuardRef.current = true;
    engine.nextItem();
  }, [autoNext, engine.currentItem, engine.nextItem]);

  const value: RundownEngineContextValue = useMemo(
    () => ({
      ...engine,
      autoNext,
      toggleAutoNext,
    }),
    [engine, autoNext]
  );

  return (
    <RundownEngineContext.Provider value={value}>
      {children}
    </RundownEngineContext.Provider>
  );
};

export function useRundownEngineContext(): RundownEngineContextValue {
  const ctx = useContext(RundownEngineContext);
  if (!ctx) {
    throw new Error(
      "useRundownEngineContext must be used within a RundownEngineProvider"
    );
  }
  return ctx;
}
