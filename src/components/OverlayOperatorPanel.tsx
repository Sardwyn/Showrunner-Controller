import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createOverlayRuntimePacketV1 } from "@scraplet/contracts/overlayRuntime";
import { sendComponentPacket } from "../runtime/sendComponentPacket";

type ExposedOverlay = {
  id: number;
  name: string;
  slug?: string;
  tenantId: string;
  publicId: string;
  previewUrl: string;
  baseResolution: { width: number; height: number };
};

type ExposedComponent = {
  instanceId: string;
  componentId: string;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  editableProps: string[];
  quickActions: Array<{ id: "show" | "hide" | "dispatch"; label: string; event?: string }>;
  zones: Array<{ id: string; label: string; x: number; y: number; width: number; height: number; propKey?: string; quickActionId?: string }>;
  propValues: Record<string, any>;
  propsSchema: Record<string, { type: string; label: string; default: any }>;
  metadata: Record<string, any>;
};

type OverlayComponentResponse = {
  overlay: ExposedOverlay;
  components: ExposedComponent[];
};

function resolveDashboardUrl(path: string) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `https://scraplet.store${path}`;
  }
  return path;
}

function buildComponentPacket(input: {
  overlay: ExposedOverlay;
  component: ExposedComponent;
  type: "component.show" | "component.hide" | "component.setProp" | "component.dispatch";
  payload: Record<string, any>;
}) {
  return createOverlayRuntimePacketV1({
    header: {
      id: `overlayop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: input.type,
      ts: Date.now(),
      producer: "studio-controller",
      platform: "internal",
      scope: {
        tenantId: input.overlay.tenantId,
        overlayPublicId: input.overlay.publicId,
        componentInstanceId: input.component.instanceId,
      },
    },
    payload: input.payload,
  });
}

function getComponentKind(component: ExposedComponent) {
  const runtimeKind = String(component.metadata?.runtimeKind || "");
  if (runtimeKind === "lowerThird") return "Lower Third";
  if (runtimeKind) return runtimeKind;
  return "Component";
}

function getDefaultQuickActions(component: ExposedComponent) {
  if (component.quickActions?.length) return component.quickActions;
  if (component.metadata?.runtimeKind === "lowerThird") {
    return [
      { id: "show" as const, label: "Show" },
      { id: "hide" as const, label: "Hide" },
    ];
  }
  return [];
}

export default function OverlayOperatorPanel() {
  const [overlays, setOverlays] = useState<ExposedOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string>("");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [overlayData, setOverlayData] = useState<OverlayComponentResponse | null>(null);
  const [draftProps, setDraftProps] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");

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

  const loadComponents = useCallback(
    async (overlayId: string) => {
      if (!overlayId) {
        setOverlayData(null);
        return;
      }
      const res = await fetch(
        resolveDashboardUrl(`/dashboard/api/controller/overlays/${encodeURIComponent(overlayId)}/components`),
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error(`Failed to load exposed components (${res.status})`);
      const data = await res.json();
      setOverlayData(data);
      const components = Array.isArray(data?.components) ? data.components : [];
      const preferred =
        components.find((component: ExposedComponent) => component.metadata?.runtimeKind === "lowerThird")?.instanceId ||
        components[0]?.instanceId ||
        "";
      setSelectedComponentId((current) =>
        current && components.some((component: ExposedComponent) => component.instanceId === current) ? current : preferred
      );
    },
    []
  );

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
    let alive = true;
    setLoading(true);
    setError("");
    loadComponents(selectedOverlayId)
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
  }, [selectedOverlayId, loadComponents]);

  const selectedComponent = useMemo(
    () => overlayData?.components?.find((component) => component.instanceId === selectedComponentId) || null,
    [overlayData, selectedComponentId]
  );

  useEffect(() => {
    if (!selectedComponent) {
      setDraftProps({});
      return;
    }
    const nextDraft: Record<string, any> = {};
    for (const key of selectedComponent.editableProps || []) {
      nextDraft[key] = selectedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(nextDraft);
  }, [selectedComponent]);

  const quickActions = useMemo(
    () => (selectedComponent ? getDefaultQuickActions(selectedComponent) : []),
    [selectedComponent]
  );

  const draftDirty = useMemo(() => {
    if (!selectedComponent) return false;
    return (selectedComponent.editableProps || []).some((key) => {
      const currentValue = selectedComponent.propValues?.[key] ?? "";
      return String(draftProps[key] ?? "") !== String(currentValue ?? "");
    });
  }, [draftProps, selectedComponent]);

  async function refreshCurrentOverlay() {
    try {
      setRefreshing(true);
      setError("");
      await loadOverlays();
      if (selectedOverlayId) {
        await loadComponents(selectedOverlayId);
      }
      setStatus("Refreshed");
      setTimeout(() => setStatus(""), 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  async function runQuickAction(action: { id: "show" | "hide" | "dispatch"; label: string; event?: string }) {
    if (!overlayData?.overlay || !selectedComponent) return;

    try {
      setStatus(`${action.label}…`);
      const type =
        action.id === "show"
          ? "component.show"
          : action.id === "hide"
            ? "component.hide"
            : "component.dispatch";
      const payload =
        action.id === "dispatch"
          ? { event: action.event || action.label, data: {} }
          : {};
      const packet = buildComponentPacket({
        overlay: overlayData.overlay,
        component: selectedComponent,
        type,
        payload,
      });
      await sendComponentPacket(packet);
      setStatus(`${action.label} sent`);
      setTimeout(() => setStatus(""), 1400);
    } catch (err: any) {
      setError(err?.message || `Failed to ${action.label.toLowerCase()}`);
    }
  }

  async function applyProps() {
    if (!overlayData?.overlay || !selectedComponent) return;
    try {
      setStatus("Updating…");
      const packet = buildComponentPacket({
        overlay: overlayData.overlay,
        component: selectedComponent,
        type: "component.setProp",
        payload: { patch: draftProps },
      });
      await sendComponentPacket(packet);
      setOverlayData((current) => {
        if (!current) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.instanceId === selectedComponent.instanceId
              ? {
                  ...component,
                  propValues: {
                    ...component.propValues,
                    ...draftProps,
                  },
                }
              : component
          ),
        };
      });
      setStatus("Updated");
      setTimeout(() => setStatus(""), 1400);
    } catch (err: any) {
      setError(err?.message || "Failed to update component props");
    }
  }

  const overlay = overlayData?.overlay || null;
  const previewSrc = overlay ? resolveDashboardUrl(overlay.previewUrl) : "";

  return (
    <div className="controller-panel overlay-operator-panel">
      <div className="controller-panel-header">
        <div>
          <h2 className="controller-panel-title mb-0">Overlay Operator</h2>
          <div className="overlay-operator-subtitle">
            Load an overlay, select an exposed component, and operate it live.
          </div>
        </div>
      </div>

      <div className="overlay-operator-toolbar">
        <select
          className="overlay-operator-select"
          value={selectedOverlayId}
          onChange={(e) => setSelectedOverlayId(e.target.value)}
        >
          <option value="">Select overlay</option>
          {overlays.map((overlayItem) => (
            <option key={overlayItem.id} value={overlayItem.id}>
              {overlayItem.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="overlay-operator-toolbar-button"
          onClick={refreshCurrentOverlay}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        {overlay ? (
          <a
            className="overlay-operator-toolbar-button is-link"
            href={previewSrc}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ) : null}
        {status ? <div className="overlay-operator-status">{status}</div> : null}
      </div>

      {error ? <div className="overlay-operator-error">{error}</div> : null}

      <div className="overlay-operator-body">
        <div className="overlay-operator-preview">
          {overlay ? (
            <div
              className="overlay-operator-stage"
              style={{ aspectRatio: `${overlay.baseResolution.width} / ${overlay.baseResolution.height}` }}
            >
              <iframe title={`${overlay.name} preview`} src={previewSrc} className="overlay-operator-iframe" />
              {overlayData?.components?.map((component) => {
                const bounds = component.bounds;
                const left = `${(bounds.x / overlay.baseResolution.width) * 100}%`;
                const top = `${(bounds.y / overlay.baseResolution.height) * 100}%`;
                const width = `${(bounds.width / overlay.baseResolution.width) * 100}%`;
                const height = `${(bounds.height / overlay.baseResolution.height) * 100}%`;
                return (
                  <button
                    key={component.instanceId}
                    type="button"
                    className={`overlay-operator-hotspot ${selectedComponentId === component.instanceId ? "is-selected" : ""}`}
                    style={{ left, top, width, height }}
                    onClick={() => setSelectedComponentId(component.instanceId)}
                    title={component.label}
                  >
                    <span>{component.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overlay-operator-empty">Choose an overlay to load its exposed components.</div>
          )}
        </div>

        <div className="overlay-operator-sidebar">
          {loading ? <div className="overlay-operator-empty">Loading…</div> : null}

          {!loading && overlayData?.components?.length ? (
            <div className="overlay-operator-list">
              {overlayData.components.map((component) => (
                <button
                  key={component.instanceId}
                  type="button"
                  className={`overlay-operator-list-item ${selectedComponentId === component.instanceId ? "is-selected" : ""}`}
                  onClick={() => setSelectedComponentId(component.instanceId)}
                >
                  <div className="overlay-operator-list-title">{component.label}</div>
                  <div className="overlay-operator-list-meta">
                    <span>{getComponentKind(component)}</span>
                    <span>{component.instanceId}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!loading && !selectedComponent ? (
            <div className="overlay-operator-empty">Select a component from the preview or the list to operate it.</div>
          ) : null}

          {selectedComponent ? (
            <>
              <div className="overlay-operator-card">
                <div className="overlay-operator-card-top">
                  <div>
                    <div className="overlay-operator-label">{selectedComponent.label}</div>
                    <div className="overlay-operator-meta">{selectedComponent.instanceId}</div>
                  </div>
                  <div className="overlay-operator-kind">{getComponentKind(selectedComponent)}</div>
                </div>
                <div className="overlay-operator-bounds">
                  {Math.round(selectedComponent.bounds.width)} x {Math.round(selectedComponent.bounds.height)} at{" "}
                  {Math.round(selectedComponent.bounds.x)},{Math.round(selectedComponent.bounds.y)}
                </div>
              </div>

              {quickActions.length ? (
                <div className="overlay-operator-actions">
                  {quickActions.map((action) => (
                    <button
                      key={`${action.id}_${action.event || ""}`}
                      type="button"
                      className="overlay-operator-action"
                      onClick={() => runQuickAction(action)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="overlay-operator-form">
                {(selectedComponent.editableProps || []).map((key) => {
                  const schema = selectedComponent.propsSchema?.[key];
                  const type = schema?.type || "text";
                  return (
                    <label key={key} className="overlay-operator-field">
                      <span>{schema?.label || key}</span>
                      {type === "color" ? (
                        <input
                          type="color"
                          value={String(draftProps[key] || "#ffffff")}
                          onChange={(e) => setDraftProps((current) => ({ ...current, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type="text"
                          value={draftProps[key] ?? ""}
                          onChange={(e) => setDraftProps((current) => ({ ...current, [key]: e.target.value }))}
                        />
                      )}
                    </label>
                  );
                })}

                {selectedComponent.editableProps?.length ? (
                  <div className="overlay-operator-form-actions">
                    <button
                      type="button"
                      className="overlay-operator-toolbar-button"
                      onClick={() => {
                        const resetDraft: Record<string, any> = {};
                        for (const key of selectedComponent.editableProps || []) {
                          resetDraft[key] = selectedComponent.propValues?.[key] ?? "";
                        }
                        setDraftProps(resetDraft);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="overlay-operator-apply"
                      onClick={applyProps}
                      disabled={!draftDirty}
                    >
                      {draftDirty ? "Apply Update" : "Up to Date"}
                    </button>
                  </div>
                ) : (
                  <div className="overlay-operator-empty">
                    This component has no editable props exposed to the controller yet.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
