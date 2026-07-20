import React from 'react';
import { createRoot } from 'react-dom/client';
import { MiniPanel } from '../minipanel/MiniPanel';
import { SettingsModal } from './SettingsModal';
import { BookPanel } from '../bookpanel/BookPanel';
import { saveBookProfile } from '../../shared/storage/bookProfiles';
import { analyzeBook } from '../../shared/api/bookAnalysis';
import { getActiveProviderConfig } from '../../shared/storage/settings';

const S = 48, G = 10, B = 44;

	const mainIconUrl = chrome.runtime.getURL('icons/main-icon.png');
const gIcon = chrome.runtime.getURL('icons/settings-icon.svg');
const hIcon = chrome.runtime.getURL('icons/gallery-icon.svg');

function btn(imgSrc: string, t: string): HTMLButtonElement {
  const b = document.createElement('button'); b.title = t;
  const img = document.createElement('img'); img.src = imgSrc;
  img.style.cssText = 'width:28px;height:28px;display:block;filter:var(--dreamy-icon-filter);';
  b.appendChild(img);
  b.style.cssText = `width:${B}px;height:${B}px;border-radius:14px;border:1px solid var(--dreamy-border);background:var(--dreamy-glass-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:var(--dreamy-text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--dreamy-shadow-md);outline:none;padding:0;`;
  return b;
}

export function renderFloatingIcon(): void {
  try {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    // Shared show/hide logic — all three buttons stay in sync
    function showButtons(): void {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      settings.style.opacity = '1';
      gallery.style.opacity = '1';
    }
    function scheduleHide(): void {
      hideTimer = setTimeout(() => {
        settings.style.opacity = '0';
        gallery.style.opacity = '0';
        hideTimer = null;
      }, 250);
    }

    // === MAIN ICON ===
    const main = document.createElement('button');
	const mainImg = document.createElement('img'); mainImg.src = mainIconUrl; mainImg.style.cssText = 'width:32px;height:32px;display:block;filter:var(--dreamy-icon-filter);'; main.appendChild(mainImg);
    main.title = 'Dreamy · 书本理解';
    main.style.cssText = `position:fixed!important;bottom:28px!important;right:28px!important;width:${S}px;height:${S}px;border-radius:16px;border:1px solid var(--dreamy-border);background:var(--dreamy-glass-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:var(--dreamy-text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--dreamy-shadow-md);outline:none;padding:0;z-index:2147483647!important;transition:transform 0.2s;`;
    main.onmouseenter = () => { main.style.transform = 'scale(1.03)'; showButtons(); };
    main.onmouseleave = () => { main.style.transform = 'scale(1)'; scheduleHide(); };

    // === HOVER BUTTONS ===
    const settings = btn(gIcon, '设置');
    settings.style.cssText += `position:fixed!important;bottom:${28+S+G}px!important;right:28px!important;z-index:2147483647!important;opacity:0;transition:opacity 0.15s;`;
    settings.onclick = (e) => { e.stopPropagation(); openSettings(); };
    settings.onmouseenter = showButtons;
    settings.onmouseleave = scheduleHide;

    const gallery = btn(hIcon, '生图历史');
    gallery.style.cssText += `position:fixed!important;bottom:${28+S+G+B+G}px!important;right:28px!important;z-index:2147483647!important;opacity:0;transition:opacity 0.15s;`;
    gallery.onclick = (e) => { e.stopPropagation(); openGallery(); };
    gallery.onmouseenter = showButtons;
    gallery.onmouseleave = scheduleHide;

    document.body.appendChild(settings);
    document.body.appendChild(gallery);
    document.body.appendChild(main);

    // === MAIN CLICK ===
    let abortCtrl: AbortController | null = null;

    (window as unknown as Record<string, unknown>).__dreamyAnalyzing = false;
    (window as unknown as Record<string, unknown>).__dreamyStopAnalysis = () => {
      if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
      (window as unknown as Record<string, unknown>).__dreamyAnalyzing = false;
    };

    main.onclick = () => { openBookPanel(); };

    // Book panel
    let bpRoot: ReturnType<typeof createRoot> | null = null, bpEl: HTMLDivElement | null = null;
    function openBookPanel(): void {
      if (bpEl) return;
      bpEl = document.createElement('div');
      bpEl.style.cssText = 'position:fixed;top:0;right:0;height:100vh;z-index:2147483648;pointer-events:auto;';
      document.body.appendChild(bpEl);
      bpRoot = createRoot(bpEl);
      bpRoot.render(React.createElement(BookPanel, { onClose: () => { bpRoot?.unmount(); bpEl?.remove(); bpRoot = null; bpEl = null; } }));
    }
    (window as unknown as Record<string, unknown>).__dreamyOpenBookPanel = openBookPanel;

    function openSettings(): void {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(el);
      const r = createRoot(el);
      r.render(React.createElement(SettingsModal, { onClose: () => { r.unmount(); el.remove(); } }));
    }

    function openGallery(): void {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:0;right:0;height:100vh;z-index:2147483646;pointer-events:auto;';
      document.body.appendChild(el);
      const r = createRoot(el);
      r.render(React.createElement(MiniPanel, { onClose: () => { r.unmount(); el.remove(); } }));
    }

    // Analysis trigger from BookPanel's "开始分析" button
    window.addEventListener('dreamy-trigger-analysis', async () => {
      if ((window as unknown as Record<string, unknown>).__dreamyAnalyzing) return;
      const c = await getActiveProviderConfig();
      if (!c.apiKey) {
        window.dispatchEvent(new CustomEvent('dreamy-book-error', { detail: '请先验证 API Key' }));
        return;
      }
      (window as unknown as Record<string, unknown>).__dreamyAnalyzing = true;
      abortCtrl = new AbortController();
      try {
        const t = document.querySelector('.readerBookInfo_name, [class*="bookName"], [class*="title"]');
        const a = document.querySelector('.readerBookInfo_author, [class*="author"]');
        const d = document.querySelector('.readerBookInfo_intro, [class*="intro"], [class*="desc"]');
        if (abortCtrl.signal.aborted) return;
        const r = await analyzeBook(t?.textContent?.trim()||'未知', a?.textContent?.trim()||'未知', d?.textContent?.trim()||'未知');
        if (abortCtrl.signal.aborted) return;
        await saveBookProfile(r);
        window.dispatchEvent(new CustomEvent('dreamy-book-analyzed', { detail: r }));
      } catch(e) {
        if ((e as Error).name === 'AbortError') return;
        console.error('[Dreamy] analysis error:', e);
        window.dispatchEvent(new CustomEvent('dreamy-book-error', { detail: e instanceof Error ? e.message : String(e) }));
      } finally {
        (window as unknown as Record<string, unknown>).__dreamyAnalyzing = false;
        abortCtrl = null;
      }
    });

    console.log('[Dreamy] Icon ready ✅');
  } catch(e) {
    console.error('[Dreamy] Icon init error:', e);
  }
}
