import {
  defaultTemplate,
  getTemplate,
  type DocumentTemplate,
  type DocumentType,
} from '@studio/shared';

const STORAGE_KEY = 'write_studio_presets_v1';

export type WorkspacePreset = {
  id: string;
  name: string;
  description: string;
  documentType: DocumentType;
  templateId: string;
  templateVersion: number;
  sections: Array<{key: string | null; title: string; purpose?: string; required?: boolean}>;
  createdAt: string;
  updatedAt: string;
};

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Returns all custom workspace template presets saved by the creator. */
export function getWorkspacePresets(): WorkspacePreset[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Saves or updates a workspace template preset. */
export function saveWorkspacePreset(
  preset: Omit<WorkspacePreset, 'id' | 'createdAt' | 'updatedAt'> & {id?: string},
): WorkspacePreset {
  const storage = safeStorage();
  const presets = getWorkspacePresets();
  const now = new Date().toISOString();

  let saved: WorkspacePreset;

  if (preset.id) {
    const index = presets.findIndex(p => p.id === preset.id);
    if (index >= 0) {
      saved = {
        ...presets[index],
        ...preset,
        id: preset.id,
        updatedAt: now,
      };
      presets[index] = saved;
    } else {
      saved = {
        ...preset,
        id: preset.id,
        createdAt: now,
        updatedAt: now,
      };
      presets.unshift(saved);
    }
  } else {
    const id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    saved = {
      ...preset,
      id,
      createdAt: now,
      updatedAt: now,
    };
    presets.unshift(saved);
  }

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(presets));
      window.dispatchEvent(new CustomEvent('workspace-presets-changed'));
    } catch {
      // Storage quota or restriction
    }
  }

  return saved;
}

/** Deletes a workspace template preset by id. */
export function deleteWorkspacePreset(id: string): void {
  const storage = safeStorage();
  const presets = getWorkspacePresets().filter(p => p.id !== id);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(presets));
      window.dispatchEvent(new CustomEvent('workspace-presets-changed'));
    } catch {
      // Storage quota or restriction
    }
  }
}

/** Converts a custom workspace preset into a DocumentTemplate compatible with the creation engine. */
export function presetToDocumentTemplate(preset: WorkspacePreset): DocumentTemplate {
  const base = getTemplate(preset.templateId, preset.templateVersion) || defaultTemplate(preset.documentType);
  return {
    id: preset.id,
    version: 1,
    name: preset.name,
    description: preset.description || `Custom ${preset.documentType} preset with ${preset.sections.length} sections.`,
    purpose: preset.description || `Workspace preset customized by the author.`,
    documentType: preset.documentType,
    audience: base?.audience || ['Workspace team'],
    acts: base?.acts || {structure: 'Outline'},
    sections: preset.sections.map((s, idx) => ({
      key: s.key || `custom-${idx + 1}`,
      title: s.title,
      hint: s.purpose || '',
      purpose: s.purpose || '',
      act: Object.keys(base?.acts || {structure: ''})[0] || 'structure',
      required: s.required ?? false,
      prompts: [],
      writingGuidance: [],
      suggestedEvidence: [],
      suggestedBlocks: base?.recommendedBlocks || [],
    })),
    metadataFields: base?.metadataFields || [],
    recommendedBlocks: base?.recommendedBlocks || [],
    validationRules: base?.validationRules || [],
    exportProfiles: base?.exportProfiles || ['pdf', 'html_zip', 'markdown', 'json_backup'],
  };
}
