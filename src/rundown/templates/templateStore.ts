// src/rundown/templates/templateStore.ts
import { RundownTemplate } from "../core/types";
import { createDemoTemplate } from "../runtime/useRundownEngine";

const TEMPLATES_KEY = "scraplet_rundown_templates_v1";
const ACTIVE_TEMPLATE_ID_KEY = "scraplet_rundown_active_template_id";

export function loadTemplates(): RundownTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      // Seed with the existing demo template so behaviour matches today
      const demo = createDemoTemplate();
      saveTemplates([demo]);
      return [demo];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("[TemplateStore] Failed to load templates:", err);
    return [];
  }
}

export function saveTemplates(templates: RundownTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("[TemplateStore] Failed to save templates:", err);
  }
}

export function loadActiveTemplateId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TEMPLATE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveTemplateId(id: string) {
  try {
    localStorage.setItem(ACTIVE_TEMPLATE_ID_KEY, id);
  } catch (err) {
    console.error("[TemplateStore] Failed to persist active template id:", err);
  }
}
