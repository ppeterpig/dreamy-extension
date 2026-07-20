import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { BoxState, StyleOption, EmotionTag } from '../../shared/types';
import { DEFAULT_STYLE } from '../../shared/types';
import { REVEAL_DURATION_MS, FONT } from '../../shared/constants';
import { ImageStage } from './ImageStage';
import { StyleSelector } from './StyleSelector';
import { EmotionTags } from './EmotionTags';
import { GenerateButton } from './GenerateButton';
import { analyzeText, generateImage } from '../../shared/api/openai';
import { saveImage } from '../../shared/storage/gallery';
import { hasBookProfile } from '../../shared/storage/bookProfiles';

const BOX_W = 360, PAD = 20, IMG_W = BOX_W - PAD * 2, IMG_H = Math.round(IMG_W * 9 / 16);

export function DreamyBox({ selectedText, origin: _origin, onClose }: {
  selectedText: string; origin: 'above' | 'below'; onClose: () => void;
}) {
  const [boxState, setBoxState] = useState<BoxState>('initial');
  const [style, setStyle] = useState<StyleOption>(DEFAULT_STYLE);
  const [emotionTags, setEmotionTags] = useState<EmotionTag[]>([]);
  const [basePrompt, setBasePrompt] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(true);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'like' | 'dislike'>('none');
  const [progress, setProgress] = useState(0);
  const [bookAnalyzed, setBookAnalyzed] = useState(true);

  const generatingRef = useRef(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preMinimizeState = useRef<'initial' | 'generating'>('initial');
  const boxStateRef = useRef<BoxState>('initial');
  const styleRef = useRef<StyleOption>(DEFAULT_STYLE);

  const runAnalysis = useCallback((text: string) => {
    setAnalyzing(true); setAnalyzeErr(null); setEmotionTags([]);
    analyzeText(text)
      .then((a) => { setBasePrompt(a.imagePrompt); setEmotionTags(a.emotionTags); setAnalyzing(false); })
      .catch((err) => { setAnalyzeErr(err instanceof Error ? err.message : String(err)); setAnalyzing(false); });
  }, []);

  useEffect(() => { runAnalysis(selectedText); hasBookProfile().then((b) => setBookAnalyzed(b)); }, [selectedText, runAnalysis]);

  // Progress animation during text analysis
  useEffect(() => {
    if (!analyzing) return;
    setProgress(0);
    const timer = setInterval(() => { setProgress((p) => Math.min(p + Math.random() * 8 + 2, 90)); }, 400);
    return () => clearInterval(timer);
  }, [analyzing]);

  const selEmotions = emotionTags.filter((t) => t.selected).map((t) => t.label);

  const doGenerate = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (generatingRef.current || !basePrompt) return;
    generatingRef.current = true;
    setGenErr(null);
    setFeedback('none');
    setProgress(0);
    setImageDataUrl(''); // clear old image so pill/progress reflect current generation

    const isMinimized = boxStateRef.current === 'minimized';
    if (!isMinimized) setBoxState('generating');

    progressTimer.current = setInterval(() => { setProgress((p) => Math.min(p + Math.random() * 12 + 3, 90)); }, 400);

    try {
      const url = await generateImage(basePrompt, styleRef.current, selEmotions, selectedText);
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setImageDataUrl(url);
      if (!isMinimized) setBoxState('revealing');
      setTimeout(() => { if (!isMinimized) setBoxState('done'); generatingRef.current = false; }, REVEAL_DURATION_MS);
    } catch (err) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(0);
      setGenErr(err instanceof Error ? err.message : String(err));
      if (!isMinimized) setBoxState('initial');
      generatingRef.current = false;
    }
  }, [basePrompt, selEmotions, selectedText]);

  useEffect(() => {
    if (boxState === 'done' && imageDataUrl) {
      saveImage({ id: `img-${Date.now()}`, dataUrl: imageDataUrl, sourceText: selectedText.slice(0, 80), sourceUrl: window.location.href, style, tags: selEmotions, timestamp: Date.now() }).catch(() => {});
    }
  }, [boxState]);

  const toggleTag = (id: string) => setEmotionTags((prev) => {
    const s = prev.filter((t) => t.selected).length;
    return prev.map((t) => t.id !== id ? t : (t.selected && s <= 1 ? t : { ...t, selected: !t.selected }));
  });

  const handleSave = () => { const a = document.createElement('a'); a.download = `dreamy-${Date.now()}.png`; a.href = imageDataUrl; a.click(); };

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  // Auto-generate when analysis completes while minimized
  const doGenerateRef = useRef(doGenerate);
  doGenerateRef.current = doGenerate;
  useEffect(() => {
    if (!analyzing && basePrompt && boxState === 'minimized' && !generatingRef.current) {
      doGenerateRef.current();
    }
  }, [analyzing, basePrompt, boxState]);

  const ref = useRef<HTMLDivElement>(null);

  const generating = boxState === 'generating' || boxState === 'revealing' || boxState === 'minimized';
  boxStateRef.current = boxState;
  styleRef.current = style;

  const minimize = () => {
    if (!generating && !analyzing) return;
    preMinimizeState.current = (boxState === 'generating' || boxState === 'revealing') ? 'generating' : 'initial';
    setBoxState('minimized');
  };

  // Drag support for pill bar and big box
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const onDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select')) return;
    const container = ref.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const container = ref.current?.parentElement;
      if (!container) return;
      container.style.left = `${e.clientX - dragOffset.current.x}px`;
      container.style.top = `${e.clientY - dragOffset.current.y}px`;
      container.style.transition = 'none';
    };
    const onMouseUp = () => {
      setDragging(false);
      const container = ref.current?.parentElement;
      if (container) container.style.transition = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  // Minimized pill bar
  // Pill bar shows during: minimized state, or when generating/revealing with image
  const showPill = boxState === 'minimized';
  if (showPill) {
    const success = progress >= 100 || !!imageDataUrl;
    const getStatusLabel = () => {
      if (analyzing) return '文本分析中...';
      if (analyzeErr) return '文本分析失败';
      if (imageDataUrl) return '图片生成成功';
      if (generatingRef.current) return '图片生成中...';
      if (basePrompt) return '文本分析完成';
      return '请选择文本进行生图';
    };
    return (
      <motion.div
        ref={ref}
        onMouseDown={onDragStart}
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          width: 260, background: 'var(--dreamy-pill-bg)', backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          borderRadius: 100, border: `1px solid var(--dreamy-border)`,
          boxShadow: 'var(--dreamy-shadow-lg), inset 0 1px 0 var(--dreamy-border)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        }}
      >
        <div
          onDoubleClick={() => {
            if (imageDataUrl) setBoxState('done');
            else if (generatingRef.current) setBoxState('generating');
            else setBoxState(preMinimizeState.current);
          }}
          title="双击展开"
          style={{
          width: 36, height: 36, borderRadius: 18, flexShrink: 0,
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          {success ? (
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: 'rgba(52,199,89,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M2 7.5L5.5 11L12 3" stroke="var(--dreamy-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ) : (
            <>
              {/* SVG spinning ring — 1/4 arc with trail */}
              <svg
                width="44" height="44"
                style={{ position: 'absolute', animation: 'dreamy-spin-ring 2s linear infinite', color: 'var(--dreamy-progress-fill)' }}
              >
                <circle
                  cx="22" cy="22" r="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="30 90"
                />
              </svg>
              {/* Static cat icon */}
              <img
                src={chrome.runtime.getURL('icons/分析1.png')}
                alt=""
                style={{ width: 36, height: 36, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'var(--dreamy-icon-filter)' }}
              />
            </>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 300, color: success ? 'var(--dreamy-success)' : 'var(--dreamy-text-secondary)' }}>
            {getStatusLabel()}
          </span>
          {!success && (
            <div style={{ height: 3, background: 'var(--dreamy-progress-track)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--dreamy-progress-fill)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
        {success && (
          <button onClick={() => setBoxState('done')} style={{
            fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-primary)',
            background: 'var(--dreamy-border)', border: `1px solid var(--dreamy-btn-hover)`,
            borderRadius: 20, padding: '5px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            查看图片
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div ref={ref}
      onMouseDown={onDragStart}
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ width: BOX_W, minWidth: BOX_W, background: 'var(--dreamy-card-bg)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 24, border: `1px solid var(--dreamy-border)`, boxShadow: 'var(--dreamy-shadow-lg)', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 400, color: 'var(--dreamy-text-primary)', letterSpacing: '0.02em' }}>Dreamy</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={minimize} title="最小化" className="dreamy-icon-btn" style={{ opacity: (generating || analyzing) ? 1 : 0.35 }}>—</button>
          <button onClick={onClose} className="dreamy-icon-btn">✕</button>
        </div>
      </div>

      <ImageStage state={boxState} imageDataUrl={imageDataUrl} error={genErr} imgW={IMG_W} imgH={IMG_H} progress={progress} onSave={handleSave} onRegenerate={() => { generatingRef.current = false; doGenerate(); }} />

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!bookAnalyzed && (
          <div style={{ background: 'rgba(90,155,255,0.08)', border: '1px solid rgba(90,155,255,0.15)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={chrome.runtime.getURL('icons/book-analysis-icon.png')} alt="" style={{ width: 30, height: 30, flexShrink: 0, opacity: 0.7, filter: 'var(--dreamy-icon-filter)' }} />
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 400, color: 'var(--dreamy-text-secondary)', lineHeight: 1.5, flex: 1 }}>分析书本后生图更准确</span>
            <span
              onClick={() => { ((window as unknown as Record<string, unknown>).__dreamyOpenBookPanel as (() => void))?.(); }}
              style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 400,
                color: 'var(--dreamy-text-info)', cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              去分析 <svg width="7" height="11" viewBox="0 0 7 11" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M1 1l4.5 4.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </div>
        )}

        <StyleSelector value={style} onChange={setStyle} locked={generating} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={chrome.runtime.getURL('icons/emotion-icon.png')} alt="" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'var(--dreamy-icon-filter)' }} />
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 300, color: 'var(--dreamy-text-secondary)', letterSpacing: '0.02em' }}>情绪关键词</span>
            {analyzing && (
              <span style={{ display: 'inline-flex', animation: 'spin 0.8s linear infinite', color: 'var(--dreamy-text-secondary)', marginLeft: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </span>
            )}
          </div>
          {analyzing ? (
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: 'var(--dreamy-text-secondary)' }}>正在分析文本内容...</span>
          ) : analyzeErr ? (
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-error)' }}>分析失败: {analyzeErr}</span>
          ) : (
            <EmotionTags tags={emotionTags} onToggle={toggleTag} />
          )}
        </div>

        {!analyzing && basePrompt && boxState === 'initial' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <GenerateButton onClick={doGenerate} />
          </div>
        )}

        {boxState === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="var(--dreamy-text-secondary)" stroke-width="1.2"/><path d="M14 2v6h6" stroke="var(--dreamy-text-secondary)" stroke-width="1.2"/></svg>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-secondary)', letterSpacing: '0.02em' }}>对本次生图评价</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 8 }}>
              <button onClick={() => setFeedback(feedback === 'like' ? 'none' : 'like')} className={feedback === 'like' ? 'animate-spring' : ''} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: feedback === 'like' ? 'var(--dreamy-text-primary)' : 'var(--dreamy-text-secondary)', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3m7-2V5a3 3 0 0 0-3-3L7 11v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button onClick={() => setFeedback(feedback === 'dislike' ? 'none' : 'dislike')} className={feedback === 'dislike' ? 'animate-spring' : ''} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: feedback === 'dislike' ? 'var(--dreamy-text-primary)' : 'var(--dreamy-text-secondary)', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleY(-1)' }}><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3m7-2V5a3 3 0 0 0-3-3L7 11v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
