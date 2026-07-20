import { createRoot } from 'react-dom/client';
import React from 'react';
import { DreamyBox } from '../dreambox/DreamyBox';
import { setDreamboxOpen, captureTextForGeneration } from '../selection/SelectionListener';
import { calcBoxPosition, clampToViewport } from '../selection/BubblePositioner';
import { MIN_TEXT_LENGTH, MAX_TEXT_LENGTH } from '../../shared/types';

const AI_ICON = chrome.runtime.getURL('icons/ai-gen-icon.png');

import { FONT } from '../../shared/constants';

function showToast(msg: string): void {
  const old = document.getElementById('dreamy-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'dreamy-toast';
  toast.style.cssText = `position:fixed!important;bottom:80px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;font-family:${FONT};font-size:13px;font-weight:300;color:var(--dreamy-error);background:var(--dreamy-glass-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:0.5px solid var(--dreamy-border-strong);border-radius:12px;padding:10px 20px;white-space:nowrap;box-shadow:var(--dreamy-shadow-md);transition:opacity 0.35s ease;`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}

interface Props { selectedText: string; onClose: () => void; }

export function SelectionBubble({ selectedText: _selectedText, onClose }: Props) {
  const handleClick = async () => {
    const bubbleEl = document.getElementById('dreamy-bubble');
    if (!bubbleEl) return;

    // Trigger copy to get actual text, then open DreamyBox
    const text = await captureTextForGeneration();
    if (!text || text.length < 2) {
      console.log('[Dreamy] no text captured, cannot generate');
      return;
    }

    // Validate text length
    if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
      showToast(`所选字数应该在${MIN_TEXT_LENGTH}-${MAX_TEXT_LENGTH}字之间，请重新选择`);
      return;
    }

    const bubbleRect = bubbleEl.getBoundingClientRect();
    const rawPos = calcBoxPosition({ top: bubbleRect.top, left: bubbleRect.left + bubbleRect.width / 2 });
    const pos = clampToViewport({ ...rawPos, origin: rawPos.origin });

    setDreamboxOpen(true);

    const boxContainer = document.createElement('div');
    boxContainer.id = 'dreamy-box-container';
    boxContainer.style.cssText = `position:fixed!important;top:${pos.top}px!important;left:${pos.left}px!important;z-index:2147483647!important;pointer-events:auto!important;`;
    document.body.appendChild(boxContainer);

    const boxRoot = createRoot(boxContainer);
    boxRoot.render(React.createElement(DreamyBox, {
      selectedText: text,
      origin: rawPos.origin,
      onClose: () => { boxRoot.unmount(); boxContainer.remove(); setDreamboxOpen(false); onClose(); },
    }));
  };

  return (
    <button onClick={handleClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: FONT,
      color: 'var(--dreamy-text-primary)', fontSize: 16, fontWeight: 300,
      borderRadius: 60, padding: '10px 18px',
      boxShadow: 'var(--dreamy-shadow-md)',
      border: `1px solid var(--dreamy-border)`,
      background: 'var(--dreamy-glass-bg)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)', cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      <img src={AI_ICON} alt="" style={{ width: 30, height: 30, flexShrink: 0, filter: 'var(--dreamy-icon-filter)' }} />
      <span>生成画面</span>
    </button>
  );
}
