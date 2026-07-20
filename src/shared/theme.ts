import { getSettings } from './storage/settings';

export type ThemeMode = 'dark' | 'light';

interface TokenMap {
  '--dreamy-bg': string;
  '--dreamy-card-bg': string;
  '--dreamy-text-primary': string;
  '--dreamy-text-secondary': string;
  '--dreamy-text-tertiary': string;
  '--dreamy-text-quaternary': string;
  '--dreamy-text-disabled': string;
  '--dreamy-text-info': string;
  '--dreamy-border': string;
  '--dreamy-border-strong': string;
  '--dreamy-input-bg': string;
  '--dreamy-btn-bg': string;
  '--dreamy-btn-hover': string;
  '--dreamy-shadow-sm': string;
  '--dreamy-shadow-md': string;
  '--dreamy-shadow-lg': string;
  '--dreamy-glass-bg': string;
  '--dreamy-toast-bg': string;
  '--dreamy-error': string;
  '--dreamy-success': string;
  '--dreamy-icon-filter': string;
  '--dreamy-pill-bg': string;
  '--dreamy-icon-btn-hover': string;
  '--dreamy-progress-track': string;
  '--dreamy-progress-fill': string;
  '--dreamy-select-color-scheme': string;
}

// Text color spec:
//   Primary  — headings, body, button labels
//   Secondary — subtitles, notes, timestamps, list supplement
//   Tertiary — placeholders, minor hints
//   Quaternary — disabled / expired / watermark
//   Info — links, blue prompts
//   Error — destructive / warning
//   Success — confirmations

const darkTokens: TokenMap = {
  '--dreamy-bg': '#1C1C1E',
  '--dreamy-card-bg': 'rgba(28,28,30,0.94)',
  '--dreamy-text-primary': 'rgba(255,255,255,1)',
  '--dreamy-text-secondary': 'rgba(255,255,255,0.55)',
  '--dreamy-text-tertiary': 'rgba(255,255,255,0.35)',
  '--dreamy-text-quaternary': 'rgba(255,255,255,0.1)',
  '--dreamy-text-disabled': '#B0B0B0',
  '--dreamy-text-info': '#5BA0F5',
  '--dreamy-border': 'rgba(255,255,255,0.08)',
  '--dreamy-border-strong': 'rgba(255,255,255,0.15)',
  '--dreamy-input-bg': 'rgba(255,255,255,0.04)',
  '--dreamy-btn-bg': 'rgba(255,255,255,0.08)',
  '--dreamy-btn-hover': 'rgba(255,255,255,0.12)',
  '--dreamy-shadow-sm': '0 1px 4px rgba(0,0,0,0.2)',
  '--dreamy-shadow-md': '0 4px 16px rgba(0,0,0,0.25)',
  '--dreamy-shadow-lg': '0 8px 30px rgba(0,0,0,0.3)',
  '--dreamy-glass-bg': 'rgba(30,30,30,0.72)',
  '--dreamy-toast-bg': 'rgba(30,30,30,0.9)',
  '--dreamy-error': '#FF5C5C',
  '--dreamy-success': '#34C759',
  '--dreamy-icon-filter': 'none',
  '--dreamy-icon-btn-hover': 'rgba(255,255,255,0.1)',
  '--dreamy-pill-bg': 'rgba(28,28,30,0.6)',
  '--dreamy-progress-track': 'rgba(255,255,255,0.06)',
  '--dreamy-progress-fill': 'rgba(255,255,255,0.25)',
  '--dreamy-select-color-scheme': 'dark',
};

const lightTokens: TokenMap = {
  '--dreamy-bg': '#F2F2F7',
  '--dreamy-card-bg': 'rgba(255,255,255,0.9)',
  '--dreamy-text-primary': 'rgba(0,0,0,1)',
  '--dreamy-text-secondary': 'rgba(0,0,0,0.5)',
  '--dreamy-text-tertiary': 'rgba(0,0,0,0.35)',
  '--dreamy-text-quaternary': 'rgba(0,0,0,0.1)',
  '--dreamy-text-disabled': '#404040',
  '--dreamy-text-info': '#007AFF',
  '--dreamy-border': 'rgba(0,0,0,0.08)',
  '--dreamy-border-strong': 'rgba(0,0,0,0.15)',
  '--dreamy-input-bg': 'rgba(0,0,0,0.04)',
  '--dreamy-btn-bg': 'rgba(0,0,0,0.06)',
  '--dreamy-btn-hover': 'rgba(0,0,0,0.1)',
  '--dreamy-shadow-sm': '0 1px 4px rgba(0,0,0,0.06)',
  '--dreamy-shadow-md': '0 4px 12px rgba(0,0,0,0.08)',
  '--dreamy-shadow-lg': '0 8px 24px rgba(0,0,0,0.1)',
  '--dreamy-glass-bg': 'rgba(255,255,255,0.8)',
  '--dreamy-toast-bg': 'rgba(245,245,245,0.95)',
  '--dreamy-error': '#EE3333',
  '--dreamy-success': '#34C759',
  '--dreamy-icon-filter': 'invert(1)',
  '--dreamy-icon-btn-hover': 'rgba(0,0,0,0.06)',
  '--dreamy-pill-bg': 'rgba(255,255,255,0.6)',
  '--dreamy-progress-track': 'rgba(0,0,0,0.1)',
  '--dreamy-progress-fill': 'rgba(0,0,0,0.35)',
  '--dreamy-select-color-scheme': 'light',
};

export function applyTheme(mode: ThemeMode): void {
  const tokens = mode === 'dark' ? darkTokens : lightTokens;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute('data-dreamy-theme', mode);
}

export async function initTheme(): Promise<void> {
  try {
    const settings = await getSettings();
    applyTheme(settings.theme);
  } catch {
    applyTheme('dark');
  }
}
