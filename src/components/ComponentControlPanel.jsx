import React from "react";
import { useOverlayControl } from "../runtime/OverlayControlContext";

function componentKindLabel(component) {
  const runtimeKind = String(component?.metadata?.runtimeKind || "");
  if (runtimeKind === "lowerThird") return "Lower Third";
  if (runtimeKind) return runtimeKind;
  return "Component";
}

export default function ComponentControlPanel() {
  const {
    overlayData,
    focusedComponentId,
    setFocusedComponentId,
    focusedComponent,
    draftProps,
    setDraftProps,
    error,
    status,
    draftDirty,
    lowerThirdMode,
    takeLowerThird,
    clearFocused,
    applyFocusedProps,
  } = useOverlayControl();

  function resetDraftProps() {
    if (!focusedComponent) return;
    const next = {};
    for (const key of focusedComponent.editableProps || []) {
      next[key] = focusedComponent.propValues?.[key] ?? "";
    }
    setDraftProps(next);
  }

  return (
    <div className="pc-panel-body component-control-panel">
      <div className="pc-panel-header">
        <span>Component Controls</span>
        {status ? <span className="component-control-status">{status}</span> : null}
      </div>

      {overlayData?.components?.length ? (
        <div className="component-control-strip">
          {overlayData.components.map((component) => (
            <button
              key={component.instanceId}
              type="button"
              className={`component-control-chip ${focusedComponentId === component.instanceId ? "is-selected" : ""}`}
              onClick={() => setFocusedComponentId(component.instanceId)}
            >
              <span className="component-control-chip-label">{component.label}</span>
              <span className="component-control-chip-kind">{componentKindLabel(component)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {!focusedComponent ? (
        <div className="component-control-empty">
          Hover and click an exposed component in the preview to focus it here.
        </div>
      ) : (
        <div className="component-control-drawer">
          <div className="component-control-drawer-header">
            <div>
              <div className="component-control-title">{focusedComponent.label}</div>
              <div className="component-control-meta">{componentKindLabel(focusedComponent)}</div>
            </div>
          </div>

          {error ? <div className="component-control-error">{error}</div> : null}

          {lowerThirdMode ? (
            <div className="component-control-lower-third">
              <div className="component-control-live">
                <div className="component-control-caption">On Air</div>
                <div className="component-control-live-title">{focusedComponent.propValues?.title || "No name on air"}</div>
                <div className="component-control-live-subtitle">{focusedComponent.propValues?.subtitle || "No title on air"}</div>
              </div>
              <div className="component-control-next">
                <div className="component-control-caption">Next</div>
                <div className="component-control-next-fields">
                  <label className="component-control-field">
                    <span>Guest Name</span>
                    <input
                      type="text"
                      value={draftProps.title ?? ""}
                      onChange={(e) => setDraftProps((current) => ({ ...current, title: e.target.value }))}
                    />
                  </label>
                  <label className="component-control-field">
                    <span>Guest Title</span>
                    <input
                      type="text"
                      value={draftProps.subtitle ?? ""}
                      onChange={(e) => setDraftProps((current) => ({ ...current, subtitle: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
              <div className="component-control-actions component-control-actions--footer">
                <button type="button" className="component-control-button is-secondary" onClick={resetDraftProps}>
                  Reset
                </button>
                <button type="button" className="component-control-button" onClick={clearFocused}>
                  Clear
                </button>
                <button type="button" className="component-control-button is-take" disabled={!draftDirty} onClick={takeLowerThird}>
                  {draftDirty ? "Take" : "Take Current"}
                </button>
              </div>
            </div>
          ) : (
            <div className="component-control-generic">
              <div className="component-control-generic-grid">
                {(focusedComponent.editableProps || []).map((key) => {
                  const schema = focusedComponent.propsSchema?.[key];
                  const type = schema?.type || "text";
                  return (
                    <label key={key} className="component-control-field">
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
              </div>
              <div className="component-control-actions component-control-actions--footer">
                <button type="button" className="component-control-button is-secondary" onClick={resetDraftProps}>
                  Reset
                </button>
                <button type="button" className="component-control-button" disabled={!draftDirty} onClick={applyFocusedProps}>
                  {draftDirty ? "Apply Update" : "Up to Date"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
