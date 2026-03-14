// src/rundown/templates/TemplateManagerProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RundownTemplate, TemplateGroup } from "../core/types";
import {
  loadTemplates,
  saveTemplates,
  loadActiveTemplateId,
  saveActiveTemplateId,
} from "./templateStore";
import { createDemoTemplate } from "../runtime/useRundownEngine";

type TemplateManagerContextValue = {
  templates: RundownTemplate[];
  activeTemplateId: string | null;
  activeTemplate: RundownTemplate | null;
  setActiveTemplateId: (id: string) => void;
  createTemplate: (partial?: Partial<RundownTemplate>) => RundownTemplate;
  updateTemplate: (id: string, patch: Partial<RundownTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
};

const TemplateManagerContext =
  createContext<TemplateManagerContextValue | null>(null);

export const TemplateManagerProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [templates, setTemplates] = useState<RundownTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateIdState] = useState<string | null>(
    null
  );

  // Initial load
  useEffect(() => {
    let loaded = loadTemplates();

    if (!loaded || loaded.length === 0) {
      const demo = createDemoTemplate();
      loaded = [demo];
      saveTemplates(loaded);
    }

    setTemplates(loaded);

    let activeId = loadActiveTemplateId();
    if (!activeId && loaded.length > 0) {
      activeId = loaded[0].id;
      saveActiveTemplateId(activeId);
    }

    setActiveTemplateIdState(activeId);
  }, []);

  const activeTemplate = useMemo(() => {
    if (!activeTemplateId) return null;
    return templates.find((t) => t.id === activeTemplateId) || null;
  }, [templates, activeTemplateId]);

  function persist(next: RundownTemplate[]) {
    setTemplates(next);
    saveTemplates(next);
  }

  function setActiveTemplateId(id: string) {
    setActiveTemplateIdState(id);
    saveActiveTemplateId(id);
  }

  function createTemplate(partial?: Partial<RundownTemplate>): RundownTemplate {
  const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const groups: TemplateGroup[] =
    (partial?.groups as TemplateGroup[]) ?? [];

  const tpl: RundownTemplate = {
    id,
    title: partial?.title ?? "New Rundown",
    version: partial?.version ?? 1,
    groups,
    // 🔧 THIS is the key change – use {} and type it correctly
    items: (partial?.items ?? {}) as RundownTemplate["items"],
    // optional, but keeps shape close to your demo template
    metadata: partial?.metadata ?? {},
  };

  const next = [...templates, tpl];
  persist(next);
  setActiveTemplateId(id);
  return tpl;
}


  function updateTemplate(id: string, patch: Partial<RundownTemplate>) {
    const next = templates.map((t) => (t.id === id ? { ...t, ...patch } : t));
    persist(next);
  }

  function deleteTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    persist(next);

    if (activeTemplateId === id) {
      const fallback = next[0] ?? null;
      setActiveTemplateIdState(fallback ? fallback.id : null);
      if (fallback) saveActiveTemplateId(fallback.id);
    }
  }

  function duplicateTemplate(id: string) {
    const orig = templates.find((t) => t.id === id);
    if (!orig) return;

    const cloneId = `tpl_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const clone: RundownTemplate = {
      ...orig,
      id: cloneId,
      title: `${orig.title} (Copy)`,
    };

    const next = [...templates, clone];
    persist(next);
    setActiveTemplateId(cloneId);
  }

  const value: TemplateManagerContextValue = {
    templates,
    activeTemplateId,
    activeTemplate,
    setActiveTemplateId,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };

  return (
    <TemplateManagerContext.Provider value={value}>
      {children}
    </TemplateManagerContext.Provider>
  );
};

export function useTemplateManager(): TemplateManagerContextValue {
  const ctx = useContext(TemplateManagerContext);
  if (!ctx) {
    throw new Error(
      "useTemplateManager must be used within a TemplateManagerProvider"
    );
  }
  return ctx;
}
