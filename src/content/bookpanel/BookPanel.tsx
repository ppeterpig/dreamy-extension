import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookProfile, CharacterCard } from '../../shared/types';
import { getBookProfile, saveBookProfile, deleteBookProfile } from '../../shared/storage/bookProfiles';
import { CharacterCardEditor } from './CharacterCard';
import { getActiveProviderConfig } from '../../shared/storage/settings';
import { PROVIDER_PRESETS } from '../../shared/types';

import { FONT } from "../../shared/constants";

interface Props { onClose: () => void; }

export function BookPanel({ onClose }: Props) {
  const [profile, setProfile] = useState<BookProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingChar, setEditingChar] = useState<CharacterCard | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  closingRef.current = closing;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReanalyze, setConfirmReanalyze] = useState(false);

  const handleClose = () => setClosing(true);

  useEffect(() => {
    getBookProfile().then((p) => {
      if (p) { setProfile(p); setLoading(false); return; }
      // Check if analysis is running globally
      if ((window as unknown as Record<string, unknown>).__dreamyAnalyzing) {
        setAnalyzing(true);
        setLoading(false);
        return;
      }
      setLoading(false);
    });

    const onAnalyzed = (e: Event) => {
      const detail = (e as CustomEvent).detail as BookProfile;
      setProfile(detail);
      setAnalyzing(false);
    };
    const onError = () => { setAnalyzing(false); };
    const onTrigger = () => { setAnalyzing(true); };
    window.addEventListener('dreamy-trigger-analysis', onTrigger);

    window.addEventListener('dreamy-book-analyzed', onAnalyzed);
    window.addEventListener('dreamy-book-error', onError);
    return () => {
      window.removeEventListener('dreamy-book-analyzed', onAnalyzed);
      window.removeEventListener('dreamy-book-error', onError);
      window.removeEventListener('dreamy-trigger-analysis', onTrigger);
    };
  }, []);

  // Clear blue dot when panel opens
  useEffect(() => {
    const statusDot = document.querySelector('#dreamy-floating-icon [style*="background"]');
    if (statusDot) (statusDot as HTMLElement).style.display = 'none';
  }, []);


  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    if (!profile) return;
    await saveBookProfile(profile);
    setSaved(true);
    setTimeout(() => { setSaved(false); setClosing(true); }, 800);
  };

  const updateWorldSetting = (text: string) => {
    if (!profile) return;
    setProfile({ ...profile, worldSetting: text });
  };

  const updateCharacter = (char: CharacterCard) => {
    if (!profile) return;
    setProfile({ ...profile, characters: profile.characters.map((c) => (c.id === char.id ? char : c)) });
    setEditingChar(null);
  };

  const confirmDeleteChar = confirmDeleteId ? profile?.characters.find((c) => c.id === confirmDeleteId) : null;

  const deleteCharacter = (id: string) => {
    setConfirmDeleteId(id);
  };

  const doDelete = () => {
    if (!profile || !confirmDeleteId) return;
    setProfile({ ...profile, characters: profile.characters.filter((c) => c.id !== confirmDeleteId) });
    setConfirmDeleteId(null);
  };

  const addCharacter = () => {
    if (!profile) return;
    const newChar: CharacterCard = {
      id: `char-${Date.now()}`, name: '', age: '', gender: '', hairStyle: '', hairColor: '',
      face: '', clothing: '', signatureItem: '', temperament: '', build: '', notes: '',
    };
    setProfile({ ...profile, characters: [...profile.characters, newChar] });
    setEditingChar(newChar);
  };

  const searchCharacter = async () => {
    if (!searchName.trim() || !profile || searching) return;
    setSearching(true);

    try {
      const config = await getActiveProviderConfig();
      if (!config.apiKey) throw new Error('未设置 API Key');

      const preset = PROVIDER_PRESETS[config.activeProvider as keyof typeof PROVIDER_PRESETS];
      const baseUrl = config.activeProvider === 'custom'
        ? config.customBaseUrl
        : (preset?.baseUrl ?? 'https://api.openai.com/v1');
      if (!baseUrl) throw new Error('请填写 API 网址');

      const prompt = `你是一位文学分析专家。请根据以下书籍的世界观，分析角色"${searchName.trim()}"的特征。

世界观：${profile.worldSetting}
书名：${profile.bookName}

请返回 JSON：
{
  "age": "", "gender": "", "hairStyle": "", "hairColor": "", "face": "",
  "clothing": "", "signatureItem": "", "temperament": "", "build": ""
}
未知字段填"未知"。`;

      const safeKey = config.apiKey.replace(/[^\x00-\xFF]/g, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeKey}` },
        body: JSON.stringify({ model: config.textModel, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
      });

      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String((data?.error as Record<string, string>)?.message ?? 'Unknown error'));

      const content = (data?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content;
      if (!content) throw new Error('No response');

      const result = JSON.parse(content) as CharacterCard;
      const newChar: CharacterCard = {
        ...result, id: `char-${Date.now()}`, name: searchName.trim(),
      };
      setProfile({ ...profile, characters: [...profile.characters, newChar] });
      setSearchName('');
      setSearchError('');
    } catch (err) {
      console.error('[Dreamy] character search failed:', err);
      setSearchError('找不到该角色，请重新输入');
    }
    setSearching(false);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={closing ? { x: '100%', opacity: 0 } : { x: 0, opacity: 1 }}
      transition={closing
        ? { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
        : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }
      }
      onAnimationComplete={() => { if (closingRef.current) onClose(); }}
      style={{
        width: 340, height: '100vh', background: 'var(--dreamy-card-bg)',
        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderLeft: `1px solid var(--dreamy-border)`,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
        position: 'relative', display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 20px 16px', flexShrink: 0 }}>
        <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 400, color: 'var(--dreamy-text-primary)', letterSpacing: '0.01em' }}>书本理解</span>
        <button onClick={handleClose} className="dreamy-icon-btn" style={{ fontSize: 16 }}>→</button>
      </div>

      <div style={{ padding: '0 20px 20px', flex: 1 }}>
        {loading ? (
          <p style={{ fontFamily: FONT, fontSize: 13, color: 'var(--dreamy-text-tertiary)' }}>加载中...</p>
        ) : analyzing && !profile ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <p style={{ fontFamily: FONT, fontSize: 14, color: 'var(--dreamy-text-secondary)', lineHeight: 1.8 }}>AI 正在分析书本...</p>
            <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--dreamy-text-tertiary)', marginTop: 12 }}>折叠侧板后仍会分析书本</p>
            <button onClick={() => { ((window as unknown as Record<string, unknown>).__dreamyStopAnalysis as (() => void))?.(); setAnalyzing(false); }} className="dreamy-pill-btn" style={{ marginTop: 14 }}>暂停分析</button>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--dreamy-text-secondary)', animation: `dreamy-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <p style={{ fontFamily: FONT, fontSize: 14, color: 'var(--dreamy-text-secondary)', lineHeight: 1.8 }}>还没有分析过这本书</p>
            <button
              onClick={async () => {
                const cfg = await getActiveProviderConfig();
                if (!cfg.apiKey) {
                  setAnalyzing(false);
                  const el = document.getElementById('dreamy-bookpanel-no-key');
                  if (el) el.style.display = 'block';
                  return;
                }
                setAnalyzing(true);
                setTimeout(() => window.dispatchEvent(new Event('dreamy-trigger-analysis')), 50);
              }}
              style={{ marginTop: 16, fontFamily: FONT, fontSize: 13, fontWeight: 300, padding: '10px 24px', borderRadius: 40, cursor: 'pointer', border: `1px solid var(--dreamy-btn-hover)`, background: 'var(--dreamy-border)', color: 'var(--dreamy-text-primary)' }}
            >开始分析</button>
            <p id="dreamy-bookpanel-no-key" style={{ display: 'none', fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-error)', marginTop: 10, textAlign: 'center' }}>请在设置中输入 API Key</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 400, color: 'var(--dreamy-text-primary)', margin: '0 0 2px' }}>{profile.bookName}</p>
              <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-secondary)', margin: 0 }}>{profile.author}</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 400, letterSpacing: '0.02em', marginBottom: 8 }}><span style={{ color: 'var(--dreamy-text-primary)' }}>🌍</span> <span style={{ color: 'var(--dreamy-text-secondary)' }}>世界观</span></div>
              <textarea value={profile.worldSetting} onChange={(e) => updateWorldSetting(e.target.value)} rows={4}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: FONT, fontSize: 13, fontWeight: 300, color: 'var(--dreamy-text-primary)', background: 'var(--dreamy-input-bg)', border: `1px solid var(--dreamy-border)`, borderRadius: 10, padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 400, letterSpacing: '0.02em' }}><span style={{ color: 'var(--dreamy-text-primary)' }}>🫅</span> <span style={{ color: 'var(--dreamy-text-secondary)' }}>角色档案</span></span>
                <button onClick={addCharacter} style={{ fontFamily: FONT, fontSize: 12, background: 'none', border: 'none', color: 'var(--dreamy-text-secondary)', cursor: 'pointer', padding: 0 }}>+ 新增</button>
              </div>

              {/* Character list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {profile.characters.map((c) => (
                  editingChar && editingChar.id === c.id ? (
                    <CharacterCardEditor key={c.id} character={editingChar} onSave={updateCharacter} onCancel={() => setEditingChar(null)} />
                  ) : (
                    <div key={c.id} onClick={() => setEditingChar(c)} style={{ background: 'var(--dreamy-input-bg)', border: `1px solid var(--dreamy-border)`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 400, color: 'var(--dreamy-text-primary)' }}>{c.name || '未命名'}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); setEditingChar(c); }} style={{ background: 'none', border: 'none', color: 'var(--dreamy-text-primary)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteCharacter(c.id); }} style={{ background: 'none', border: 'none', color: 'var(--dreamy-text-primary)', cursor: 'pointer', fontSize: 13, padding: 0 }}>🗑</button>
                        </div>
                      </div>
                      <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 300, color: 'var(--dreamy-text-secondary)', margin: '4px 0 0' }}>
                        {[c.gender, c.age, c.build, c.temperament].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )
                ))}
              </div>

              {/* AI Character search */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" value={searchName} onChange={(e) => { setSearchName(e.target.value); setSearchError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchCharacter(); }}
                  placeholder="输入角色名，AI 分析特征"
                  style={{ flex: 1, boxSizing: 'border-box', fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-primary)', background: 'var(--dreamy-input-bg)', border: `1px solid var(--dreamy-border)`, borderRadius: 8, padding: '7px 10px', outline: 'none' }}
                />
                <button onClick={searchCharacter} disabled={searching || !searchName.trim()}
                  style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, padding: '7px 14px', borderRadius: 8, border: `1px solid var(--dreamy-btn-hover)`, background: 'var(--dreamy-btn-bg)', color: searching ? 'var(--dreamy-text-disabled)' : 'var(--dreamy-text-primary)', cursor: searching ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: searchName.trim() ? 1 : 0.4 }}
                >
                  {searching ? '分析中...' : 'AI 分析'}
                </button>
              </div>
              {searchError && (
                <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-error)', margin: '6px 0 0' }}>{searchError}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 300, padding: '8px 0', borderRadius: 40, border: `1px solid var(--dreamy-btn-hover)`, background: saved ? 'rgba(52,199,89,0.15)' : 'var(--dreamy-border)', color: saved ? 'var(--dreamy-success)' : 'var(--dreamy-text-primary)', cursor: 'pointer' }}>
                {saved ? <span>已保存 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M2 7.5L5.5 11L12 3" stroke="var(--dreamy-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span> : '保存修改'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmReanalyze(true)} style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 300, padding: '8px 0', borderRadius: 40, border: `1px solid var(--dreamy-btn-hover)`, background: 'transparent', color: 'var(--dreamy-text-secondary)', cursor: 'pointer' }}>
                重新分析
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reanalyze confirmation */}
      <AnimatePresence>
        {confirmReanalyze && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute', bottom: 20, left: 16, right: 16,
              padding: '20px 20px 18px',
              background: 'var(--dreamy-bg)',
              borderRadius: 18,
              border: `1px solid var(--dreamy-border)`,
              boxShadow: 'var(--dreamy-shadow-md)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              zIndex: 10,
            }}
          >
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: 'var(--dreamy-text-primary)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                确定要重新分析「{profile?.bookName || '本书'}」吗？
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmReanalyze(false)}
                  style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, padding: '7px 28px', borderRadius: 40, border: `1px solid var(--dreamy-btn-hover)`, background: 'var(--dreamy-btn-bg)', color: 'var(--dreamy-text-secondary)', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={async () => {
                  setConfirmReanalyze(false);
                  setProfile(null);
                  try { await deleteBookProfile(); } catch {}
                  setAnalyzing(true);
                  setTimeout(() => window.dispatchEvent(new Event('dreamy-trigger-analysis')), 50);
                }}
                  style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, padding: '7px 28px', borderRadius: 40, border: `1px solid var(--dreamy-btn-hover)`, background: 'var(--dreamy-btn-bg)', color: 'var(--dreamy-text-primary)', cursor: 'pointer' }}>
                  确认
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Custom delete confirmation — card inside sidebar */}
      <AnimatePresence>
        {confirmDeleteId && confirmDeleteChar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute', bottom: 20, left: 16, right: 16,
              padding: '20px 20px 18px',
              background: 'var(--dreamy-bg)',
              borderRadius: 18,
              border: `1px solid var(--dreamy-border)`,
              boxShadow: 'var(--dreamy-shadow-md)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}
          >
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: 'var(--dreamy-text-primary)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                确定要删除角色「{confirmDeleteChar.name || '未命名'}」吗？
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmDeleteId(null)}
                  style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, padding: '7px 28px', borderRadius: 40, border: `1px solid var(--dreamy-btn-hover)`, background: 'var(--dreamy-btn-bg)', color: 'var(--dreamy-text-secondary)', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={doDelete}
                  style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, padding: '7px 28px', borderRadius: 40, border: '1px solid rgba(224,96,96,0.25)', background: 'rgba(224,96,96,0.12)', color: 'var(--dreamy-error)', cursor: 'pointer' }}>
                  删除
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
