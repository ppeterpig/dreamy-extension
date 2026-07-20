import { useState, useEffect } from 'react';
import type { DreamySettings, AIProvider } from '../shared/types';
import { PROVIDER_PRESETS } from '../shared/types';
import { getSettings, saveSettings } from '../shared/storage/settings';

const PROVIDER_LIST: { id: AIProvider; name: string; description: string }[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4.1 / DALL-E 3' },
  { id: 'doubao', name: '豆包 (ByteDance)', description: '豆包 Seedream 生图' },
  { id: 'zhipu', name: '智谱AI (GLM)', description: 'CogView 生图' },
  { id: 'anthropic', name: 'Anthropic Claude', description: '文学解析（无生图）' },
  { id: 'deepseek', name: 'DeepSeek', description: '高性价比文本解析' },
  { id: 'custom', name: '自定义', description: '相容 OpenAI 格式的 API' },
];

export default function Options() {
  const [settings, setSettings] = useState<DreamySettings | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      const providers = { ...s.providers };
      for (const p of PROVIDER_LIST) {
        if (!providers[p.id]) {
          providers[p.id] = { apiKey: '' };
        }
      }
      setSettings({ ...s, providers });
    });
  }, []);

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#111] text-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#9E9E9E] text-sm">載入中...</p>
      </div>
    );
  }

  const handleProviderChange = (providerId: AIProvider) => {
    const preset = PROVIDER_PRESETS[providerId as keyof typeof PROVIDER_PRESETS];
    setSettings({
      ...settings,
      activeProvider: providerId,
      activeTextModel: preset?.models[0] ?? settings.activeTextModel,
      activeImageModel: preset?.imageModels[0] ?? settings.activeImageModel,
    });
  };

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    setSettings({
      ...settings,
      providers: {
        ...settings.providers,
        [providerId]: { apiKey },
      },
    });
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setToast('設置已保存');
    setTimeout(() => setToast(null), 2000);
  };

  const activeProvider = settings.activeProvider;
  const preset = PROVIDER_PRESETS[activeProvider as keyof typeof PROVIDER_PRESETS];

  return (
    <div className="min-h-screen bg-[#111] text-[#F5F5F5] p-10 flex justify-center">
      <div className="max-w-lg w-full space-y-8">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Dreamy 設置</h1>
          <p className="text-[#9E9E9E] text-sm mt-2">配置 AI 模型 API Key</p>
        </div>

        {/* Provider grid */}
        <div className="space-y-3">
          <label className="text-sm text-[#9E9E9E]">AI 服務提供商</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_LIST.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  activeProvider === p.id
                    ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-transparent hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <div className="text-xs text-[#F5F5F5]">{p.name}</div>
                <div className="text-[10px] text-[#6E6E6E] mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm text-[#9E9E9E]">
            {PROVIDER_LIST.find((p) => p.id === activeProvider)?.name} API Key
          </label>
          <input
            type="password"
            value={settings.providers[activeProvider]?.apiKey ?? ''}
            onChange={(e) => handleApiKeyChange(activeProvider, e.target.value)}
            placeholder={
              activeProvider === 'openai' ? 'sk-...' :
              activeProvider === 'doubao' ? 'ark_...' :
              activeProvider === 'zhipu' ? '...' :
              '輸入 API Key...'
            }
            className="w-full bg-[rgba(30,30,30,0.72)] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-3 text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[rgba(255,255,255,0.2)] transition-colors text-sm"
          />
        </div>

        {/* Model selection */}
        {preset && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[#9E9E9E]">文本解析模型</label>
              <select
                value={settings.activeTextModel}
                onChange={(e) =>
                  setSettings({ ...settings, activeTextModel: e.target.value })
                }
                className="w-full bg-[rgba(30,30,30,0.72)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] outline-none cursor-pointer"
              >
                {preset.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {preset.imageModels.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-[#9E9E9E]">生圖模型</label>
                <select
                  value={settings.activeImageModel}
                  onChange={(e) =>
                    setSettings({ ...settings, activeImageModel: e.target.value })
                  }
                  className="w-full bg-[rgba(30,30,30,0.72)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] outline-none cursor-pointer"
                >
                  {preset.imageModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-3 text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.12)] transition-colors text-sm font-light"
        >
          保存設置
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-bg glass-border rounded-xl px-6 py-3 text-sm text-[#F5F5F5] shadow-[0_4px_20px_rgba(0,0,0,0.5)] animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
