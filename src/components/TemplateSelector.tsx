// src/components/TemplateSelector.tsx
import React from "react";
import { useTemplateManager } from "../rundown/templates/TemplateManagerProvider";

const TemplateSelector: React.FC = () => {
  const {
    templates,
    activeTemplateId,
    setActiveTemplateId,
    createTemplate,
    duplicateTemplate,
    deleteTemplate,
  } = useTemplateManager();

  if (!templates.length) return null;

  return (
    <div className="pc-template-selector">
      <label>
        {/* label removed */}

        <select
          value={activeTemplateId ?? ""}
          onChange={(e) => setActiveTemplateId(e.target.value)}
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.title}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="pc-template-btn"
        onClick={() => createTemplate()}
      >
        + New
      </button>

      <button
        type="button"
        className="pc-template-btn"
        disabled={!activeTemplateId}
        onClick={() => activeTemplateId && duplicateTemplate(activeTemplateId)}
      >
        Duplicate
      </button>

      <button
        type="button"
        className="pc-template-btn pc-template-btn-danger"
        disabled={!activeTemplateId || templates.length <= 1}
        onClick={() => {
          if (!activeTemplateId) return;
          if (!window.confirm("Delete this rundown template?")) return;
          deleteTemplate(activeTemplateId);
        }}
      >
        Delete
      </button>
    </div>
  );
};

export default TemplateSelector;
