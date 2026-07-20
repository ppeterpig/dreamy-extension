import type { BookProfile, CharacterCard } from '../types';
import { getActiveProviderConfig } from '../storage/settings';
import { getBookId } from '../storage/bookProfiles';

function generateId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function analyzeBook(
  bookName: string,
  author: string,
  description: string,
): Promise<BookProfile> {
  const config = await getActiveProviderConfig();
  if (!config.apiKey) throw new Error('未设置 API Key');

  // Use the same base URL as the text analysis
  const { PROVIDER_PRESETS } = await import('../types');
  const preset = PROVIDER_PRESETS[config.activeProvider as keyof typeof PROVIDER_PRESETS];
  const baseUrl = config.activeProvider === 'custom'
    ? config.customBaseUrl
    : (preset?.baseUrl ?? 'https://api.openai.com/v1');
  if (!baseUrl) throw new Error('请填写 API 网址');

  const prompt = `你是一位文学分析专家。请根据以下书籍信息，生成：

1. 世界觀（100字內）：故事背景、時代、氛圍、視覺風格
2. 角色檔案（列出所有主要角色）：

書籍：${bookName}
作者：${author}
簡介：${description}

返回纯 JSON（不要 markdown 代码块）：
{
  "worldSetting": "...",
  "characters": [
    {
      "name": "", "age": "", "gender": "",
      "hairStyle": "", "hairColor": "", "face": "",
      "clothing": "", "signatureItem": "",
      "temperament": "", "build": ""
    }
  ]
}`;

  // Sanitize API key — browsers reject non-ISO-8859-1 in headers
  const safeKey = config.apiKey.replace(/[^\x00-\xFF]/g, '');
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeKey}` },
    body: JSON.stringify({
      model: config.textModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data?.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  const content = (data?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content;
  if (!content) throw new Error('No response');

  const result = JSON.parse(content) as { worldSetting: string; characters: CharacterCard[] };

  return {
    bookId: getBookId(),
    bookName,
    author,
    worldSetting: result.worldSetting,
    characters: (result.characters || []).map((c) => ({ ...c, id: generateId() })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
