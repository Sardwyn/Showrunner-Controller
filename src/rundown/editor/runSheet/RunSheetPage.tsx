// src/rundown/editor/runSheet/RunSheetPage.tsx
import React from "react";
import { RundownTemplate, TemplateGroup, TemplateCard } from "../../core/types";

type RunSheetPageProps = {
  template: RundownTemplate;
  updateTemplate: (next: RundownTemplate) => void;
};

const RunSheetPage: React.FC<RunSheetPageProps> = ({
  template,
  updateTemplate,
}) => {
  const addGroup = () => {
    const newGroup: TemplateGroup = {
      id: `grp-${Date.now()}`,
      title: "New Group",
      itemIds: [],
    };

    updateTemplate({
      ...template,
      groups: [...template.groups, newGroup],
    });
  };

  return (
    <div className="run-sheet">
      {template.groups.map((g) => (
        <div key={g.id} className="run-sheet-group">
          <div className="run-sheet-group-header">
            <h3>{g.title}</h3>
          </div>

          <div className="run-sheet-items">
            {g.itemIds.map((id) => {
              const card: TemplateCard | undefined = template.items[id];
              if (!card) return null;

              return (
                <div key={id} className="run-sheet-item">
                  <div className="run-sheet-item-main">
                    <span className="run-sheet-item-title">{card.title}</span>
                  </div>
                  <div className="run-sheet-item-meta">
                    <span className="run-sheet-item-type">{card.type}</span>
                    {card.duration != null && (
                      <span className="run-sheet-item-duration">
                        {card.duration}s
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button type="button" onClick={addGroup}>
        + Add Group
      </button>
    </div>
  );
};

export default RunSheetPage;
