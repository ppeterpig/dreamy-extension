import type { LiteraryAnalysis, StyleOption } from '../types';
import { PROVIDER_PRESETS } from '../types';
import { buildLiteraryAnalysisPrompt, buildFinalImagePrompt, injectBookContext } from './prompts';
import { getActiveProviderConfig } from '../storage/settings';
import { getBookProfile } from '../storage/bookProfiles';

async function apiFetch(apiKey: string, baseUrl: string, path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `${baseUrl}${path}`;
  const safeKey = apiKey.replace(/[^\x00-\xFF]/g, '');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data?.error as Record<string, string>)?.message ?? data?.msg ?? `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

export async function analyzeText(text: string): Promise<LiteraryAnalysis> {
  const config = await getActiveProviderConfig();
  console.log('[Dreamy] analyzeText — provider:', config.activeProvider, 'model:', config.textModel);
  console.log('[Dreamy] full config:', JSON.stringify({ provider: config.activeProvider, textModel: config.textModel, imageModel: config.imageModel, baseUrl: config.customBaseUrl, customModels: config.customModels, customImageModels: config.customImageModels }));
  if (!config.apiKey) throw new Error('未设置 API Key');
  if (!config.textModel) throw new Error('未设置文本模型名称，请在设置中填写');

  const preset = PROVIDER_PRESETS[config.activeProvider as keyof typeof PROVIDER_PRESETS];
  const baseUrl = config.activeProvider === 'custom' ? config.customBaseUrl : (preset?.baseUrl ?? 'https://api.openai.com/v1');
  if (!baseUrl) throw new Error('请填写 API 网址');
  const prompt = buildLiteraryAnalysisPrompt(text);

  const data = await apiFetch(config.apiKey, baseUrl, '/chat/completions', {
    model: config.textModel,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = (data?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content;
  if (!content) throw new Error('No response from API');
  const result = JSON.parse(content) as { imagePrompt: string; emotions: string[] };

  return {
    imagePrompt: result.imagePrompt,
    emotionTags: result.emotions.map((label, index) => ({ id: `emotion-${index}`, label, selected: true })),
  };
}

export async function generateImage(
  basePrompt: string, style: StyleOption, selectedEmotions: string[], originalText: string,
): Promise<string> {
  const config = await getActiveProviderConfig();
  console.log('[Dreamy] generateImage — provider:', config.activeProvider, 'model:', config.imageModel);
  if (!config.apiKey) throw new Error('未设置 API Key');

  // Inject book context if available
  const bookProfile = await getBookProfile();
  console.log('[Dreamy] bookProfile found:', !!bookProfile, bookProfile ? `chars:${bookProfile.characters.length} world:${bookProfile.worldSetting.slice(0, 30)}` : 'none');
  let contextualPrompt = buildFinalImagePrompt(basePrompt, style, selectedEmotions);
  if (bookProfile) {
    contextualPrompt = injectBookContext(contextualPrompt, bookProfile, originalText);
    console.log('[Dreamy] injected book context');
  } else {
    console.log('[Dreamy] no book profile — prompt without context');
  }
  console.log('[Dreamy] final prompt:', contextualPrompt.slice(0, 150));

  const preset = PROVIDER_PRESETS[config.activeProvider as keyof typeof PROVIDER_PRESETS];
  const baseUrl = config.activeProvider === 'custom' ? config.customBaseUrl : (preset?.baseUrl ?? 'https://api.openai.com/v1');
  if (!baseUrl) throw new Error('请填写 API 网址');

  const data = await apiFetch(config.apiKey, baseUrl, '/images/generations', {
    model: config.imageModel,
    prompt: contextualPrompt,
    size: '1792x1024',
  });

  const imgData = (data?.data as Array<{ url?: string; b64_json?: string }>)?.[0];
  if (imgData?.b64_json) return `data:image/png;base64,${imgData.b64_json}`;
  if (imgData?.url) return imgData.url;
  throw new Error('API 未返回图片数据');
}
