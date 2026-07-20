import { useState, useEffect } from 'react';
import type { DreamySettings, AIProvider } from '../../shared/types';
import { PROVIDER_PRESETS } from '../../shared/types';
import { getSettings, saveSettings } from '../../shared/storage/settings';
import { applyTheme } from '../../shared/theme';
import { FONT } from '../../shared/constants';

interface Props {
  onClose: () => void;
}

const PROVIDER_LIST: { id: AIProvider; name: string; desc: string }[] = [
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4.1 / DALL·E 3' },
  { id: 'doubao', name: '豆包', desc: 'Seedream 生图' },
  { id: 'zhipu', name: '智谱 AI', desc: 'CogView 生图' },
  { id: 'deepseek', name: 'DeepSeek', desc: '高性价比文本' },
  { id: 'anthropic', name: 'Claude', desc: '文学解析' },
  { id: 'custom', name: '自定义', desc: 'OpenAI 兼容' },
];

const s = (base: Record<string, unknown>, overrides: Record<string, unknown>) => ({ ...base, ...overrides });

const labelStyle = {
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--dreamy-text-secondary)',
  letterSpacing: '0.02em',
  marginBottom: 6,
};

const inputStyle = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 400,
  width: '100%',
  background: 'var(--dreamy-input-bg)',
  border: `1px solid var(--dreamy-border)`,
  borderRadius: 10,
  padding: '10px 14px',
  color: 'var(--dreamy-text-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

export function SettingsModal({ onClose }: Props) {
  const [settings, setSettings] = useState<DreamySettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    getSettings().then((s) => {
      const providers = { ...s.providers };
      for (const p of PROVIDER_LIST) {
        if (!providers[p.id]) providers[p.id] = { apiKey: '' };
      }
      setSettings({ ...s, providers });
    });
  }, []);

  if (!settings) return null;

  const activeId = settings.activeProvider;
  const preset = PROVIDER_PRESETS[activeId as keyof typeof PROVIDER_PRESETS];

  const switchProvider = (pid: AIProvider) => {
    if (pid === 'custom') {
      setSettings({
        ...settings,
        activeProvider: pid,
        activeTextModel: settings.customModels || '',
        activeImageModel: settings.customImageModels || '',
      });
    } else {
      const p = PROVIDER_PRESETS[pid as keyof typeof PROVIDER_PRESETS];
      setSettings({
        ...settings,
        activeProvider: pid,
        activeTextModel: p?.models[0] ?? settings.activeTextModel,
        activeImageModel: p?.imageModels[0] ?? settings.activeImageModel,
      });
    }
  };

  const validateKey = async () => {
    const key = settings.providers[activeId]?.apiKey ?? '';
    if (!key || key.length < 5) {
      setKeyValid(false);
      setKeyError('API Key 不能为空');
      return;
    }
    setValidating(true);
    setKeyError('');
    try {
      const preset = PROVIDER_PRESETS[activeId as keyof typeof PROVIDER_PRESETS];
      const baseUrl = activeId === 'custom' ? settings.customBaseUrl : (preset?.baseUrl ?? 'https://api.openai.com/v1');
      const safeKey = key.replace(/[^\x00-\xFF]/g, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeKey}` },
        body: JSON.stringify({ model: settings.activeTextModel || 'gpt-4.1-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      });
      if (res.ok || res.status === 400) {
        // 400 = valid auth but bad request (model not found etc.) — key is valid
        setKeyValid(true);
        setKeyError('');
      } else {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = (data?.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
        setKeyValid(false);
        setKeyError(msg.includes('key') || msg.includes('auth') || msg.includes('API') || msg.includes('401') || msg.includes('403') ? 'API Key 填写错误' : msg);
      }
    } catch {
      setKeyValid(false);
      setKeyError('网络连接失败，请检查 API 网址');
    }
    setValidating(false);
  };

  // Reset validation when provider or key changes
  const handleKeyChange = (val: string) => {
    setKeyValid(null);
    setKeyError('');
    setSettings({
      ...settings!,
      providers: { ...settings!.providers, [activeId]: { apiKey: val } },
    });
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2147483647,
      }}
    >
      <div
        style={{
          width: 420,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'var(--dreamy-card-bg)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: `1px solid var(--dreamy-border)`,
          borderRadius: 24,
          boxShadow: 'var(--dreamy-shadow-lg)',
          padding: '32px 28px 24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 400, color: 'var(--dreamy-text-primary)', letterSpacing: '0.01em', margin: 0 }}>
              设置
            </h2>
            {/* Theme toggle */}
            <div
              onClick={() => {
                const next = settings.theme === 'dark' ? 'light' : 'dark';
                setSettings({ ...settings, theme: next });
                applyTheme(next);
                saveSettings({ theme: next });
              }}
              title={settings.theme === 'dark' ? '深色模式' : '浅色模式'}
              style={{
                width: 44, height: 22, borderRadius: 11,
                background: settings.theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                border: `1px solid var(--dreamy-border)`,
                position: 'relative', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                transition: 'background 0.25s ease',
              }}
            >
              <div style={{
                position: 'absolute',
                left: settings.theme === 'dark' ? 2 : 24,
                width: 18, height: 18, borderRadius: 9,
                background: settings.theme === 'dark' ? '#3A3A3C' : '#FFFFFF',
                boxShadow: 'var(--dreamy-shadow-sm)',
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {settings.theme === 'dark' ? (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#CECED0" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="dreamy-icon-btn" style={{ fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Provider selector */}
          <div>
            <div style={labelStyle}>AI 服务</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PROVIDER_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => switchProvider(p.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: activeId === p.id ? `1px solid var(--dreamy-border-strong)` : `1px solid var(--dreamy-btn-bg)`,
                    background: activeId === p.id ? 'var(--dreamy-btn-bg)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center' as const,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: activeId === p.id ? 500 : 300, color: activeId === p.id ? 'var(--dreamy-text-primary)' : 'var(--dreamy-text-secondary)' }}>
                    {p.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <div style={labelStyle}>API Key</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                value={settings.providers[activeId]?.apiKey ?? ''}
                onChange={(e) => handleKeyChange(e.target.value)}
                onBlur={() => { if (settings.providers[activeId]?.apiKey) validateKey(); }}
                placeholder="粘贴 API Key..."
                style={{ ...inputStyle, flex: 1, borderColor: keyValid === false ? 'rgba(224,96,96,0.4)' : keyValid === true ? 'rgba(52,199,89,0.3)' : 'var(--dreamy-border)' }}
              />
              <button
                onClick={validateKey}
                disabled={validating || !settings.providers[activeId]?.apiKey}
                style={{
                  fontFamily: FONT, fontSize: 12, fontWeight: 400,
                  padding: '10px 14px', borderRadius: 10, cursor: validating ? 'default' : 'pointer',
                  border: `1px solid var(--dreamy-border)`, background: 'var(--dreamy-input-bg)',
                  color: 'var(--dreamy-text-secondary)', whiteSpace: 'nowrap', opacity: settings.providers[activeId]?.apiKey ? 1 : 0.4,
                }}
              >
                {validating ? '验证中...' : '验证'}
              </button>
            </div>
            {keyError && (
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 400, color: 'var(--dreamy-error)', marginTop: 4 }}>
                {keyError}
              </div>
            )}
            {keyValid === true && (
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 400, color: 'var(--dreamy-success)', marginTop: 4 }}>
                API Key 验证通过 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M2 7.5L5.5 11L12 3" stroke="var(--dreamy-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            {!keyError && keyValid === null && (
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 400, color: 'var(--dreamy-text-tertiary)', marginTop: 4 }}>
                仅存储在本地浏览器
              </div>
            )}
          </div>

          {/* Custom provider fields */}
          {activeId === 'custom' && (
            <>
              <div>
                <div style={labelStyle}>API 网址</div>
                <input
                  type="text"
                  value={settings.customBaseUrl}
                  onChange={(e) => setSettings({ ...settings, customBaseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  style={inputStyle}
                />
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 400, color: 'var(--dreamy-text-tertiary)', marginTop: 4 }}>
                  兼容 OpenAI 格式的 API 地址
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={labelStyle}>文本模型名称</div>
                  <input
                    type="text"
                    value={settings.customModels}
                    onChange={(e) => setSettings({ ...settings, customModels: e.target.value, activeTextModel: e.target.value })}
                    placeholder="gpt-4.1-mini"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>生图模型名称</div>
                  <input
                    type="text"
                    value={settings.customImageModels}
                    onChange={(e) => setSettings({ ...settings, customImageModels: e.target.value, activeImageModel: e.target.value })}
                    placeholder="dall-e-3"
                    style={inputStyle}
                  />
                </div>
              </div>
            </>
          )}

          {/* Model selects */}
          {activeId !== 'custom' && preset && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={labelStyle}>文本模型</div>
                <select
                  value={settings.activeTextModel}
                  onChange={(e) => setSettings({ ...settings, activeTextModel: e.target.value })}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    colorScheme: 'var(--dreamy-select-color-scheme)',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%239E9E9E' fill='none' stroke-width='1.2'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: 30,
                  }}
                >
                  {preset.models.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              {preset.imageModels.length > 0 ? (
                <div>
                  <div style={labelStyle}>生图模型</div>
                  <select
                    value={settings.activeImageModel}
                    onChange={(e) => setSettings({ ...settings, activeImageModel: e.target.value })}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%239E9E9E' fill='none' stroke-width='1.2'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 10px center',
                      paddingRight: 30,
                    }}
                  >
                    {preset.imageModels.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              ) : (
                <div>
                  <div style={s(labelStyle, { color: 'var(--dreamy-text-disabled)' })}>生图模型</div>
                  <div style={{ ...inputStyle, color: 'var(--dreamy-text-disabled)', fontStyle: 'italic' }}>
                    不支持生图
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saved || keyValid !== true}
            style={{
              width: '100%',
              borderRadius: 12,
              padding: '12px 0',
              border: (saved || keyValid !== true) ? `1px solid var(--dreamy-btn-bg)` : `1px solid var(--dreamy-btn-hover)`,
              background: (saved || keyValid !== true) ? 'var(--dreamy-btn-bg)' : 'var(--dreamy-btn-hover)',
              color: (saved || keyValid !== true) ? 'var(--dreamy-text-disabled)' : 'var(--dreamy-text-primary)',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: '0.02em',
              cursor: (saved || keyValid !== true) ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {saved ? <span>已保存 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M2 7.5L5.5 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span> : keyValid === true ? '保存设置' : '请先验证 API Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
