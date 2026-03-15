import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createOverlayRuntimePacketV1 } from "@scraplet/contracts/overlayRuntime";
import { sendComponentPacket } from "./sendComponentPacket";

const OverlayControlContext = createContext(null);

function resolveDashboardUrl(path) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `https://scraplet.store${path}`;
  }
  return path;
}

function buildComponentPacket({ overlay, component, type, payload }) {
  return createOverlayRuntimePacketV1({
    header: {
      id: `overlayctl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      ts: Date.now(),
      producer: "studio-controller",
      platform: "internal",
      scope: {
        tenantId: overlay.tenantId,
        overlayPublicId: overlay.publicId,
        componentInstanceId: component.instanceId,
      },
    },
    payload,
  });
}

export function OverlayControlProvider({ children }) {
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(() => window.localStorage.getItem("scraplet_overlay_operator_overlayId") || "");
  const [overlayData, setOverlayData] = useState(null);
  const [focusedComponentId, setFocusedComponentId] = useState("");
  const [hoveredComponentId, setHoveredComponentId] = useState("");
  const [draftProps, setDraftProps] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadOverlays = useCallback(async () => {
    const res = await fetch(resolveDashboardUrl("/dashboard/api/controller/overlays"), {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load overlays (${res.status})`);
    const data = await res.json();
    const next = Array.isArray(data?.overlays) ? data.overlays : [];
    setOverlays(next);
    setSelectedOverlayId((current) => {
      if (current && next.some((overlay) => String(overlay.id) === current)) return current;
      return next[0]?.id != null ? String(next[0].id) : "";
    });
  }, []);

  const loadOverlayComponents = useCallback(async (overlayId) => {
    if (!overlayId) {
      setOverlayData(null);
      setFocusedComponentId("");
      return;
    }
    const res = await fetch(resolveDashboardUrl(`/dashboard/api/controller/overlays/${encodeURIComponent(overlayId)}/components`), {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load exposed components (${res.status})`);
    const data = await res.json();
    const components = Array.isArray(data?.components) ? data.components : [];
    setOverlayData(data);
    setFocusedComponentId((current) => (
      current && components.some((component) => component.instanceId === current) ? current : ""
    ));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    loadOverlays()
      .catch((err) => {
        if (alive) setError(err?.message || "Failed to load overlays");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadOverlays]);

  useEffect(() => {
    if (!selectedOverlayId) {
      setOverlayData(null);
      return;
    }
    window.localStorage.setItem("scraplet_overlay_operator_overlayId", selectedOverlayId);
    let alive = true;
    setLoading(true);
    setError("");
    loadOverlayComponents(selectedOverlayId)
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Failed to load exposed components");
        setOverlayData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedOverlayId, loadOverlayComponents]);

  const focusedComponent = useMemo(
    () => overlayData?.components?.find((component) => component.instanceId === focusedComponentId) || null,
    [overlayData, focusedComponentId]
  );

  useEffect(() => {
    if (!focusedComponent) {
      setDraftProps({});
      return;
    }
    const next = {};
    for (const key of focusedComponent.editableProps || []) {
      next[key] = focusedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(next);
  }, [focusedComponent]);

  const lowerThirdMode = focusedComponent?.metadata?.runtimeKind === "lowerThird";

  const draftDirty = useMemo(() => {
    if (!focusedComponent) return false;
    return (focusedComponent.editableProps || []).some((key) => {
      const current = focusedComponent.propValues?.[key] ?? "";
      return String(draftProps[key] ?? "") !== String(current);
    });
  }, [draftProps, focusedComponent]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await loadOverlays();
      if (selectedOverlayId) await loadOverlayComponents(selectedOverlayId);
      setStatus("Refreshed");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (err) {
      setError(err?.message || "Failed to refresh overlay controls");
    } finally {
      setLoading(false);
    }
  }, [loadOverlays, loadOverlayComponents, selectedOverlayId]);

  const sendAction = useCallback(async (type, payload = {}) => {
    if (!overlayData?.overlay || !focusedComponent) return;
    const packet = buildComponentPacket({
      overlay: overlayData.overlay,
      component: focusedComponent,
      type,
      payload,
    });
    await sendComponentPacket(packet);
  }, [overlayData, focusedComponent]);

  const takeLowerThird = useCallback(async () => {
    if (!focusedComponent) return;
    try {
      setStatus("Taking…");
      await sendAction("component.setProp", { patch: draftProps });
      await sendAction("component.show", {});
      setOverlayData((current) => {
        if (!current) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.instanceId === focusedComponent.instanceId
              ? { ...component, propValues: { ...component.propValues, ...draftProps } }
              : component
          ),
        };
      });
      setStatus("On air");
      window.setTimeout(() => setStatus(""), 1400);
    } catch (err) {
      setError(err?.message || "Failed to take lower third");
    }
  }, [draftProps, focusedComponent, sendAction]);

  const clearFocused = useCallback(async () => {
    try {
      setStatus("Clearing…");
      await sendAction("component.hide", {});
      setStatus("Cleared");
      window.setTimeout(() => setStatus(""), 1400);
    } catch (err) {
      setError(err?.message || "Failed to clear component");
    }
  }, [sendAction]);

  const applyFocusedProps = useCallback(async () => {
    try {
      setStatus("Updating…");
      await sendAction("component.setProp", { patch: draftProps });
      setOverlayData((current) => {
        if (!current || !focusedComponent) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.instanceId === focusedComponent.instanceId
              ? { ...component, propValues: { ...component.propValues, ...draftProps } }
              : component
          ),
        };
      });
      setStatus("Updated");
      window.setTimeout(() => setStatus(""), 1400);
    } catch (err) {
      setError(err?.message || "Failed to update component props");
    }
  }, [draftProps, focusedComponent, sendAction]);

  const value = {
    overlays,
    selectedOverlayId,
    setSelectedOverlayId,
    overlayData,
    focusedComponentId,
    setFocusedComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    draftProps,
    setDraftProps,
    loading,
    error,
    setError,
    status,
    lowerThirdMode,
    draftDirty,
    refresh,
    focusedComponent,
    takeLowerThird,
    clearFocused,
    applyFocusedProps,
  };

  return <OverlayControlContext.Provider value={value}>{children}</OverlayControlContext.Provider>;
}

export function useOverlayControl() {
  const context = useContext(OverlayControlContext);
  if (!context) {
    throw new Error("useOverlayControl must be used within OverlayControlProvider");
  }
  return context;
}
