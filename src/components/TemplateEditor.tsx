// src/components/TemplateEditor.tsx
import React from "react";
import { useTemplateManager } from "../rundown/templates/TemplateManagerProvider";

export default function TemplateEditor() {
  const { activeTemplate, updateTemplate } = useTemplateManager();

  if (!activeTemplate) return null;

  // We don't assume your exact group/item shapes – treat them as generic objects
  const groups = (activeTemplate.groups ?? []) as any[];
  const items = (activeTemplate.items ?? {}) as Record<string, any>;

  const handleTemplateTitleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateTemplate(activeTemplate.id, { title: e.target.value });
  };

  const handleGroupTitleChange = (groupId: string, title: string) => {
    const nextGroups = groups.map((g) =>
      g.id === groupId ? { ...g, title } : g
    );
    updateTemplate(activeTemplate.id, { groups: nextGroups as any });
  };

  const handleItemFieldChange = (
    itemId: string,
    field: "title" | "type" | "duration",
    value: string
  ) => {
    const current = items[itemId] ?? {};
    const nextItems = {
      ...items,
      [itemId]: {
        ...current,
        [field]:
          field === "duration" ? Number(value) || 0 : value,
      },
    };
    updateTemplate(activeTemplate.id, { items: nextItems as any });
  };

  return (
    <div className="template-editor">
      <div className="template-editor-header">
        <label>
          Rundown title:&nbsp;
          <input
            type="text"
            value={activeTemplate.title}
            onChange={handleTemplateTitleChange}
          />
        </label>
      </div>

      <div className="template-editor-body">
        {groups.map((group) => {
          const itemIds: string[] = (group.itemIds ?? []) as string[];
          return (
            <div key={group.id} className="template-editor-group">
              <div className="template-editor-group-header">
                <input
                  type="text"
                  value={group.title ?? ""}
                  onChange={(e) =>
                    handleGroupTitleChange(group.id, e.target.value)
                  }
                  placeholder="Group title"
                />
              </div>

              <div className="template-editor-items">
                {itemIds.map((itemId) => {
                  const item = items[itemId] ?? {};
                  return (
                    <div
                      key={itemId}
                      className="template-editor-item-row"
                    >
                      <input
                        type="text"
                        value={item.title ?? ""}
                        onChange={(e) =>
                          handleItemFieldChange(
                            itemId,
                            "title",
                            e.target.value
                          )
                        }
                        placeholder="Item title"
                      />
                      <input
                        type="text"
                        value={item.type ?? ""}
                        onChange={(e) =>
                          handleItemFieldChange(
                            itemId,
                            "type",
                            e.target.value
                          )
                        }
                        placeholder="Type"
                      />
                      <input
                        type="number"
                        min={0}
                        value={item.duration ?? 0}
                        onChange={(e) =>
                          handleItemFieldChange(
                            itemId,
                            "duration",
                            e.target.value
                          )
                        }
                        placeholder="Duration (s)"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
