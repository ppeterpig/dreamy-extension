import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GeneratedImage } from '../../shared/types';
import { getAllImages, deleteImage } from '../../shared/storage/gallery';

import { FONT } from "../../shared/constants";

interface Props { onClose: () => void; }

const EXPAND_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3H21V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21H3V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3L14 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 21L10 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SAVE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11L12 16L17 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function MiniPanel({ onClose }: Props) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ img: GeneratedImage; x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Outside click to close panel
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('click', h), 100);
    return () => { clearTimeout(t); document.removeEventListener('click', h); };
  }, [onClose]);

  // Close context menu on any click
  useEffect(() => {
    const h = () => setCtxMenu(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    getAllImages().then((imgs) => setImages(imgs.reverse())).catch(() => setImages([]));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      getAllImages().then((imgs) => setImages(imgs.reverse())).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const doSave = useCallback((img: GeneratedImage) => {
    const a = document.createElement('a');
    a.download = `dreamy-${img.timestamp}.png`;
    a.href = img.dataUrl;
    a.click();
  }, []);

  const doDelete = useCallback(async (img: GeneratedImage) => {
    await deleteImage(img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    setCtxMenu(null);
  }, []);

  const doCopyImage = useCallback(async (img: GeneratedImage) => {
    try {
      const res = await fetch(img.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      // Fallback: copy URL
      await navigator.clipboard.writeText(img.dataUrl);
    }
    setCtxMenu(null);
  }, []);

  return (
    <>
      <motion.div
        ref={panelRef}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          width: 320, height: '100vh',
          background: 'var(--dreamy-card-bg)', backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderLeft: `1px solid var(--dreamy-border)`,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          pointerEvents: preview ? 'none' : 'auto',
          opacity: preview ? 0.4 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 20px 16px', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 400, color: 'var(--dreamy-text-primary)', letterSpacing: '0.01em' }}>生图历史</span>
          <button onClick={onClose} className="dreamy-icon-btn">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
          {images.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}>
              <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 300, color: 'var(--dreamy-text-secondary)', textAlign: 'center', lineHeight: 1.8 }}>
                还没有生成图片<br />请选择文字点击生成图片吧
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {images.map((img) => (
                <div key={img.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const menuW = 150, menuH = 160;
                    let mx = e.clientX, my = e.clientY;
                    if (mx + menuW > window.innerWidth - 8) mx = window.innerWidth - menuW - 8;
                    if (my + menuH > window.innerHeight - 8) my = window.innerHeight - menuH - 8;
                    if (mx < 8) mx = 8;
                    if (my < 8) my = 8;
                    setCtxMenu({ img, x: mx, y: my });
                  }}
                  style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', border: `1px solid var(--dreamy-border)`, cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget.querySelector('.hover-btns') as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={(e) => { (e.currentTarget.querySelector('.hover-btns') as HTMLElement).style.opacity = '0'; }}
                >
                  <img src={img.dataUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onClick={() => setPreview(img)} />

                  {/* Hover overlay icons */}
                  <div className="hover-btns" style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity 0.15s ease', pointerEvents: 'none' }}>
                    {/* Expand — top right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreview(img); }}
                      style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, border: 'none', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, pointerEvents: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: EXPAND_ICON }}
                    />
                    {/* Save — bottom right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); doSave(img); }}
                      style={{ position: 'absolute', bottom: 6, right: 6, width: 22, height: 22, borderRadius: 11, border: 'none', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, pointerEvents: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: SAVE_ICON }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Full-screen preview modal with image + source text */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreview(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}
          >
            {/* Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 520, width: '100%',
                background: 'var(--dreamy-bg)',
                borderRadius: 18,
                border: `1px solid var(--dreamy-border)`,
                boxShadow: 'var(--dreamy-shadow-lg)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Image — 16:9 */}
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <img
                  src={preview.dataUrl} alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); doSave(preview); }}
                  title="下载"
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 32, height: 32, borderRadius: 16,
                    border: 'none',
                    background: 'var(--dreamy-glass-bg)', backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)', color: 'var(--dreamy-text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, padding: 0,
                  }}
                >
                  ↓
                </button>
              </div>

              {/* Source text */}
              <div style={{ padding: '14px 20px 18px' }}>
                <p style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 400, color: 'var(--dreamy-text-secondary)',
                  lineHeight: 1.7, margin: 0,
                  maxHeight: 80, overflowY: 'auto',
                }}>
                  {preview.sourceText || '（无原文记录）'}
                </p>
              </div>
            </motion.div>

            {/* Close — top right corner of screen */}
            <button onClick={() => setPreview(null)} style={{ position: 'fixed', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, border: 'none', background: 'var(--dreamy-glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'var(--dreamy-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, padding: 0 }}>✕</button>

            {/* Save — bottom right corner of screen */}
            <button onClick={() => doSave(preview)} style={{ position: 'fixed', bottom: 20, right: 20, width: 40, height: 40, borderRadius: 20, border: 'none', background: 'var(--dreamy-glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'var(--dreamy-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, padding: 0 }}>↓</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 2147483647,
            background: 'var(--dreamy-card-bg)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', borderRadius: 14,
            border: `1px solid var(--dreamy-border)`,
            boxShadow: 'var(--dreamy-shadow-lg)', padding: 6, minWidth: 140,
          }}
        >
          {[
            { label: '查看大图', action: () => setPreview(ctxMenu.img) },
            { label: '复制图片', action: () => doCopyImage(ctxMenu.img) },
            { label: '保存图片', action: () => doSave(ctxMenu.img) },
            { label: '删除', action: () => doDelete(ctxMenu.img), danger: true },
          ].map((item) => (
            <div
              key={item.label}
              onClick={item.action}
              style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 300,
                color: item.danger ? 'var(--dreamy-error)' : 'var(--dreamy-text-primary)',
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--dreamy-btn-bg)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
