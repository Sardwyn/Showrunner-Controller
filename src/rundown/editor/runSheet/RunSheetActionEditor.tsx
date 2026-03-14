// src/rundown/editor/runSheet/RunSheetActionEditor.tsx
import React from "react";
import {
  TemplateCard,
  RundownAction,
} from "../../core/types";

type RunSheetActionEditorProps = {
  card: TemplateCard;
  onChange: (next: TemplateCard) => void;
};

const RunSheetActionEditor: React.FC<RunSheetActionEditorProps> = ({
  card,
  onChange,
}) => {
  const actions: RundownAction[] = card.actions ?? [];

  const handleAddAction = () => {
    const newAction: RundownAction = {
      id: `act-${Date.now()}`,
      kind: "layout",
      phase: "enter",
      config: {
        layoutMode: "live_gameplay",
      },
    };

    onChange({
      ...card,
      actions: [...actions, newAction],
    });
  };

  return (
    <div className="run-sheet-action-editor">
      <h4>Actions</h4>

      {actions.length === 0 && <p>No actions configured.</p>}

      {actions.map((a) => (
        <div key={a.id} className="run-sheet-action-row">
          <span className="run-sheet-action-kind">{a.kind}</span>
          <span className="run-sheet-action-phase">{a.phase}</span>
        </div>
      ))}

      <button type="button" onClick={handleAddAction}>
        + Add Action
      </button>
    </div>
  );
};

export default RunSheetActionEditor;
