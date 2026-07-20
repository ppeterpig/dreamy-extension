import { createRoot, type Root } from 'react-dom/client';
import React from 'react';
import { SelectionBubble } from '../bubble/SelectionBubble';

let bubbleRoot: Root | null = null;
let bubbleContainer: HTMLDivElement | null = null;
let dreamboxOpen = false;
let currentText = '';
let capturedText = '';
let processing = false;
let lastOverlayCount = 0;

export function isDreamboxOpen(): boolean { return dreamboxOpen; }
export function setDreamboxOpen(open: boolean): void { dreamboxOpen = open; }

function isDreamyElement(el: Element | null): boolean {
  if (!el) return false;
  return !!el.closest('#dreamy-bubble, #dreamy-box-container, #dreamy-floating-icon, #dreamy-minipanel');
}
function isReaderPage(): boolean { return window.location.href.includes('/web/reader/'); }

const PREFIXES = /^(热门想法|复制|划线|写想法|AI问书|查询|马克笔|波浪线|直线|想法|评论|搜索)/g;
function cleanText(t: string): string { return t.replace(PREFIXES, '').replace(/\s+/g, '').trim(); }

let toastObserver: MutationObserver | null = null;

function injectToastBlocker(): void {
  // Inject CSS once to hide WeChat Read's copy toast
  const styleId = 'dreamy-hide-toast';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    [class*="toast" i]:not([id*="dreamy"]), [class*="Toast" i]:not([id*="dreamy"]),
    [class*="tips" i]:not([id*="dreamy"]), [class*="Tips" i]:not([id*="dreamy"]),
    [class*="snackbar" i]:not([id*="dreamy"]), [class*="Snackbar" i]:not([id*="dreamy"])
    {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
  console.log('[Dreamy] toast blocker CSS injected');
}

function startToastObserver(): void {
  if (toastObserver) return;
  toastObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.textContent || '';
        if (text.includes('已复制') || text.includes('复制成功') || text.includes('剪贴板')) {
          node.remove();
          console.log('[Dreamy] removed toast:', text.slice(0, 30));
          return;
        }
        // Also check children
        const child = node.querySelector('[class*="toast" i], [class*="Toast" i], [class*="tips" i]');
        if (child) {
          const childText = child.textContent || '';
          if (childText.includes('已复制') || childText.includes('复制成功') || childText.includes('剪贴板')) {
            child.remove();
            console.log('[Dreamy] removed nested toast:', childText.slice(0, 30));
          }
        }
      }
    }
  });
  toastObserver.observe(document.body, { childList: true, subtree: true });
}


function triggerCopyAndGetText(): Promise<string> {
  return new Promise((resolve) => {
    capturedText = '';

    const native = window.getSelection()?.toString().trim();
    if (native && native.length >= 2) { resolve(native); return; }

    // Inject toast-blocking CSS once (never removed)
    injectToastBlocker();
    // Watch for and remove any toast that appears despite CSS
    startToastObserver();

    const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
    const clipDesc = Object.getOwnPropertyDescriptor(navigator.clipboard, 'writeText');
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: (t: string) => { capturedText = t; return Promise.resolve(); },
      writable: true, configurable: true,
    });

    const btns = document.querySelectorAll('button, span, div, [role="button"]');
    for (const btn of btns) {
      if (btn.textContent?.trim() === '复制' && (btn as HTMLElement).offsetParent !== null) {
        (btn as HTMLElement).click();
        break;
      }
    }

    // Restore clipboard after capture; keep toast blocker active
    setTimeout(() => {
      if (clipDesc) {
        Object.defineProperty(navigator.clipboard, 'writeText', clipDesc);
      } else {
        navigator.clipboard.writeText = origWrite;
      }
      resolve(capturedText || '');
    }, 300);
  });
}

function getBubblePosition(): { top: number; left: number } {
  const overlays = document.querySelectorAll('.wr_selection');
  if (overlays.length > 0) {
    let maxY = -Infinity, sumX = 0, count = 0;
    for (const ov of overlays) {
      const r = ov.getBoundingClientRect();
      if (r.bottom > maxY) maxY = r.bottom;
      sumX += r.left + r.width / 2; count++;
    }
    return { top: maxY + 8, left: sumX / count };
  }
  return { top: 400, left: 600 };
}

function showBubble(pos: { top: number; left: number }): void {
  if (pos.top < 0) pos.top = 16; if (pos.left < 0) pos.left = 16;
  if (!bubbleContainer) { bubbleContainer = document.createElement('div'); bubbleContainer.id = 'dreamy-bubble'; document.body.appendChild(bubbleContainer); }
  bubbleContainer.style.cssText = `position:fixed!important;top:${pos.top}px!important;left:${pos.left}px!important;transform:translate(-50%,0)!important;z-index:2147483647!important;pointer-events:auto!important;`;
  if (!bubbleRoot) bubbleRoot = createRoot(bubbleContainer);
  bubbleRoot.render(React.createElement(SelectionBubble, { selectedText: currentText, onClose: removeBubble }));
}

export function removeBubble(): void {
  if (bubbleRoot) { bubbleRoot.unmount(); bubbleRoot = null; }
  if (bubbleContainer) { bubbleContainer.remove(); bubbleContainer = null; }
  currentText = '';
  processing = false;
}

// Called when user clicks "生成画面" — copies text then opens DreamyBox
export async function captureTextForGeneration(): Promise<string> {
  const text = await triggerCopyAndGetText();
  return cleanText(text);
}

// Check if selection exists and show bubble
function checkAndShow(): void {
  if (dreamboxOpen || processing) return;
  const overlays = document.querySelectorAll('.wr_selection');
  const count = overlays.length;
  if (count === 0) { lastOverlayCount = 0; removeBubble(); return; }

  // Avoid re-triggering for same selection
  if (count === lastOverlayCount && bubbleContainer) return;
  lastOverlayCount = count;

  console.log('[Dreamy] selection detected, overlays:', count);
  const pos = getBubblePosition();
  currentText = '';

  showBubble(pos);
}

function setupMainFrame(_rc: HTMLElement): void {
  if (!isReaderPage()) { console.log('[Dreamy] main: skip'); return; }
  console.log('[Dreamy] main: ready');

  // Capture copy events for text
  document.addEventListener('copy', () => {
    const t = window.getSelection()?.toString().trim();
    if (t && t.length >= 2) capturedText = t;
  }, true);

  // Watch for wr_selection
  const observer = new MutationObserver(() => checkAndShow());
  observer.observe(document.body, { childList: true, subtree: true });

  // Mouseup trigger
  document.addEventListener('mouseup', (e) => {
    if (isDreamyElement(e.target as Element) || dreamboxOpen) return;
    setTimeout(checkAndShow, 250);
  }, true);

  // Copy from iframes
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'DREAMY_COPY' && e.data?.text) {
      capturedText = e.data.text;
    }
  });
}

function setupIframe(): void {
  console.log('[Dreamy] iframe: ready');
  document.addEventListener('copy', () => {
    const t = window.getSelection()?.toString().trim();
    if (t) window.top?.postMessage({ type: 'DREAMY_COPY', text: t }, '*');
  }, true);
}

export function initSelectionListener(rootContainer: HTMLElement): void {
  if (window !== window.top) setupIframe();
  else setupMainFrame(rootContainer);
}
