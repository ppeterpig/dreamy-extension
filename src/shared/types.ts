export type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'doubao' | 'zhipu' | 'custom';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
  imageModels: string[];
}

export const PROVIDER_PRESETS: Record<Exclude<AIProvider, 'custom'>, Omit<ProviderConfig, 'apiKey'>> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'],
    imageModels: ['dall-e-3', 'gpt-image-1'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5'],
    imageModels: [],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    imageModels: [],
  },
  doubao: {
    id: 'doubao',
    name: '豆包 (ByteDance)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seed-1-6', 'doubao-pro-32k', 'doubao-lite-32k'],
    imageModels: ['doubao-seedream-3-0'],
  },
  zhipu: {
    id: 'zhipu',
    name: '智谱AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.1', 'glm-4.5', 'glm-4-plus', 'glm-4-flash'],
    imageModels: ['cogview-4', 'cogview-3-plus', 'cogview-3'],
  },
};

export interface DreamySettings {
  providers: Record<string, { apiKey: string }>;
  activeProvider: AIProvider;
  activeTextModel: string;
  activeImageModel: string;
  customBaseUrl: string;
  customModels: string;
  customImageModels: string;
  preferredStyle: StyleOption | null;
  persistStyle: boolean;
  theme: 'dark' | 'light';
}

export type StyleOption = '电影感' | '黑白' | '日漫' | '水彩' | '科幻';

export const STYLE_OPTIONS: StyleOption[] = [
  '电影感',
  '黑白',
  '日漫',
  '水彩',
  '科幻',
];

export const DEFAULT_STYLE: StyleOption = '电影感';

export type BoxState = 'initial' | 'generating' | 'minimized' | 'revealing' | 'done';

export interface EmotionTag {
  id: string;
  label: string;
  selected: boolean;
}

export interface LiteraryAnalysis {
  imagePrompt: string;
  emotionTags: EmotionTag[];
}

export interface GeneratedImage {
  id: string;
  dataUrl: string;
  sourceText: string;
  sourceUrl: string;
  style: StyleOption;
  tags: string[];
  timestamp: number;
}

// Book analysis types
export interface CharacterCard {
  id: string;
  name: string;
  age: string;
  gender: string;
  hairStyle: string;
  hairColor: string;
  face: string;
  clothing: string;
  signatureItem: string;
  temperament: string;
  build: string;
  notes: string;
}

export interface BookProfile {
  bookId: string;
  bookName: string;
  author: string;
  worldSetting: string;
  characters: CharacterCard[];
  createdAt: number;
  updatedAt: number;
}

export type IconStatus = 'idle' | 'analyzing' | 'analyzed' | 'generating' | 'generated' | 'hasResult';

export interface ReadingTrace {
  id: string;
  imageDataUrl: string;
  sourceText: string;
  position: { top: number; left: number };
}

// Word count limits
export const MIN_TEXT_LENGTH = 15;
export const MAX_TEXT_LENGTH = 250;
