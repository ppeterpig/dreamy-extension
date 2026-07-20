import type { DreamySettings, AIProvider } from '../types';

const SETTINGS_KEY = 'dreamy_settings';

const defaults: DreamySettings = {
  providers: {},
  activeProvider: 'openai',
  activeTextModel: 'gpt-4.1-mini',
  activeImageModel: 'dall-e-3',
  customBaseUrl: '',
  customModels: '',
  customImageModels: '',
  preferredStyle: null,
  persistStyle: false,
  theme: 'dark',
};

export async function getSettings(): Promise<DreamySettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaults, ...(result[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: Partial<DreamySettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
}

export async function getApiKey(provider?: AIProvider): Promise<string> {
  const settings = await getSettings();
  const p = provider ?? settings.activeProvider;
  return settings.providers[p]?.apiKey ?? '';
}

export async function getActiveProviderConfig(): Promise<{
  apiKey: string;
  activeProvider: string;
  textModel: string;
  imageModel: string;
  customBaseUrl: string;
  customModels: string;
  customImageModels: string;
}> {
  const settings = await getSettings();
  return {
    apiKey: settings.providers[settings.activeProvider]?.apiKey ?? '',
    activeProvider: settings.activeProvider,
    textModel: settings.activeTextModel,
    imageModel: settings.activeImageModel,
    customBaseUrl: settings.customBaseUrl,
    customModels: settings.customModels,
    customImageModels: settings.customImageModels,
  };
}
