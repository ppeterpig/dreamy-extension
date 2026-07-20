export function buildLiteraryAnalysisPrompt(text: string): string {
  return `You are a literary mood interpreter. Analyze the following text from a novel and:

1. Write a short, cinematic image generation prompt in English (max 200 chars). Focus on mood, lighting, atmosphere, spatial composition, and camera language — NOT literal illustration. The image should feel like a film still.

2. Identify 2-5 emotional keywords that capture the text's mood. These should be single Chinese words (e.g. 孤寂, 溫暖, 壓抑, 空靈, 緊張, 史詩感, 親密, 懸疑, 寧靜, 焦慮).

Return your response as valid JSON with exactly this structure:
{
  "imagePrompt": "the english image prompt here",
  "emotions": ["情緒1", "情緒2", "情緒3"]
}

Text to analyze:
"""
${text}
"""`;
}

import type { BookProfile } from '../types';

export function injectBookContext(
  imagePrompt: string,
  profile: BookProfile,
  selectedText: string,
): string {
  const parts: string[] = [];

  // Worldview
  if (profile.worldSetting) {
    parts.push(`【世界观】${profile.worldSetting}`);
  }

  // Character profiles
  if (profile.characters.length > 0) {
    // Check if selected text mentions any character by name
    // Split names like "哈利·波特" into ["哈利", "波特"] for partial matching
    const mentionedChars = profile.characters.filter((c) => {
      if (!c.name) return false;
      const nameParts = c.name.split(/[·\s\-\—]+/);
      return nameParts.some((part) => part.length >= 1 && selectedText.includes(part))
        || selectedText.includes(c.name);
    });

    console.log('[Dreamy] character matching — mentioned:', mentionedChars.map(c => c.name).join(', ') || 'none', 'total chars:', profile.characters.length);

    if (mentionedChars.length > 0) {
      const charDescs = mentionedChars.map((c) => {
        const attrs = [
          c.name, c.gender, c.age,
          c.hairStyle, c.hairColor, c.face,
          c.clothing, c.build, c.temperament,
          c.signatureItem,
        ].filter(Boolean).join('，');
        return `- ${attrs}`;
      });

      parts.push(`【角色档案】\n${charDescs.join('\n')}`);
      parts.push('画面中的角色外貌必须严格符合以上描述。');
    }
  }

  if (parts.length > 0) {
    parts.push('\n---\n');
    parts.push(imagePrompt);
    console.log('[Dreamy] injected book context, parts:', parts.length);
    return parts.join('\n');
  }

  return imagePrompt;
}

export function buildFinalImagePrompt(
  basePrompt: string,
  style: string,
  selectedEmotions: string[],
): string {
  const styleMap: Record<string, string> = {
    '电影感': 'cinematic lighting, film grain, anamorphic lens',
    '黑白': 'film noir style, high contrast, deep shadows, moody, dramatic lighting',
    '日漫': 'anime manga art style, cel shaded, vibrant, hand-drawn illustration',
    '水彩': 'watercolor painting style, soft edges, flowing colors, artistic, dreamy',
    '科幻': 'sci-fi aesthetic, futuristic, neon accents, atmospheric, cyberpunk tones',
  };

  const styleAddition = styleMap[style] ?? styleMap['电影感'];
  const emotionAddition =
    selectedEmotions.length > 0
      ? `emotional tone: ${selectedEmotions.join(', ')}`
      : '';

  return `${basePrompt}, ${styleAddition}, ${emotionAddition}, 16:9 aspect ratio, landscape orientation`.trim().replace(/, $/, '');
}
