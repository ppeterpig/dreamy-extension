import type { StyleOption } from '../../shared/types';
import { STYLE_OPTIONS } from '../../shared/types';
import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../shared/storage/settings';

import { FONT } from "../../shared/constants";

interface Props { value: StyleOption; onChange: (s: StyleOption) => void; locked?: boolean; }

export function StyleSelector({ value, onChange, locked }: Props) {
  const [persist, setPersist] = useState(false);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setPersist(s.persistStyle);
      if (s.persistStyle && s.preferredStyle) onChange(s.preferredStyle);
    });
  }, []);

  const handleClick = (s: StyleOption) => {
    if (locked) { setWarn(true); setTimeout(() => setWarn(false), 2000); return; }
    onChange(s); if (persist) saveSettings({ preferredStyle: s });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src={chrome.runtime.getURL('icons/style-icon.png')} alt="" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'var(--dreamy-icon-filter)' }} />
          <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 300, color: 'var(--dreamy-text-secondary)', letterSpacing: '0.02em' }}>风格</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0, transform: 'translateY(-2px)' }}>
            <input type="checkbox" checked={persist} onChange={async (e) => { setPersist(e.target.checked); await saveSettings({ persistStyle: e.target.checked }); if (e.target.checked) await saveSettings({ preferredStyle: value }); }} style={{ width: 12, height: 12, cursor: 'pointer', opacity: 0, position: 'absolute', inset: 0, margin: 0, zIndex: 2 }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: persist ? `1.5px solid var(--dreamy-text-primary)` : '1.5px solid var(--dreamy-border-strong)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s', opacity: persist ? 0.8 : 1 }}>
              {persist && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.8 }}><path d="M2 5L4 7L8 3" stroke="var(--dreamy-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
          </div>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-disabled)' }}>后续沿用该风格</span>
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {STYLE_OPTIONS.map((s) => (
          <button key={s} onClick={() => handleClick(s)} style={{
            fontFamily: FONT, fontSize: 14, fontWeight: value === s ? 500 : 300, letterSpacing: '0.02em',
            padding: '4px 16px', borderRadius: 40, cursor: locked ? 'default' : 'pointer',
            border: value === s ? `1px solid var(--dreamy-border-strong)` : `1px solid var(--dreamy-border)`,
            background: value === s ? 'var(--dreamy-btn-bg)' : 'transparent',
            color: value === s ? 'var(--dreamy-text-primary)' : 'var(--dreamy-text-secondary)',
            opacity: locked ? 0.5 : 1, transition: 'all 0.15s ease',
          }}>{s}</button>
        ))}
      </div>
      {warn && (
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-error)' }}>生图过程中不可切换风格</span>
      )}
    </div>
  );
}
