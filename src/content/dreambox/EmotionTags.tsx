import type { EmotionTag } from '../../shared/types';

import { FONT } from "../../shared/constants";

interface Props { tags: EmotionTag[]; onToggle: (id: string) => void; }

export function EmotionTags({ tags, onToggle }: Props) {
  const selectedCount = tags.filter((t) => t.selected).length;

  const handleClick = (tag: EmotionTag, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (tag.selected && selectedCount <= 1) {
      // Show hint that at least 1 must remain
      const toast = document.createElement('div');
      toast.textContent = '至少保留一个情绪关键词';
      toast.style.cssText = `
        position:fixed;bottom:120px;left:50%;transform:translateX(-50%);
        z-index:2147483647;pointer-events:none;
        background:var(--dreamy-toast-bg);backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);
        border:1px solid var(--dreamy-btn-hover);border-radius:12px;
        padding:8px 18px;color:var(--dreamy-text-primary);
        font-family:${FONT};font-size:12px;font-weight:300;
        animation:dreamy-fade-in 0.3s ease-out;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1800);
      return;
    }
    onToggle(tag.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map((tag) => (
          <button
            key={tag.id}
            onMouseDown={(e) => handleClick(tag, e)}
            style={{
              fontFamily: FONT, fontSize: 14, fontWeight: tag.selected ? 500 : 300, letterSpacing: '0.02em',
              padding: '4px 16px', borderRadius: 40, cursor: 'pointer',
              border: tag.selected ? `1px solid var(--dreamy-border-strong)` : `1px solid var(--dreamy-border)`,
              background: tag.selected ? 'var(--dreamy-btn-bg)' : 'transparent',
              color: tag.selected ? 'var(--dreamy-text-primary)' : 'var(--dreamy-text-secondary)',
              transition: 'all 0.15s ease',
              outline: 'none', userSelect: 'none',
            }}
          >
            {tag.label}
          </button>
        ))}
      </div>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-disabled)', letterSpacing: '0.02em' }}>
        至少选择一个情绪关键词
      </span>
    </div>
  );
}
