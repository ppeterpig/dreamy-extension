import { useState } from 'react';
import type { CharacterCard } from '../../shared/types';

import { FONT } from "../../shared/constants";

interface Props {
  character: CharacterCard;
  onSave: (c: CharacterCard) => void;
  onCancel: () => void;
}

const FIELDS: { key: keyof CharacterCard; label: string }[] = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年龄' },
  { key: 'gender', label: '性别' },
  { key: 'hairStyle', label: '发型' },
  { key: 'hairColor', label: '发色' },
  { key: 'face', label: '脸型' },
  { key: 'clothing', label: '服装' },
  { key: 'signatureItem', label: '标志性物件' },
  { key: 'temperament', label: '气质' },
  { key: 'build', label: '身高体型' },
  { key: 'notes', label: '备注' },
];

export function CharacterCardEditor({ character, onSave, onCancel }: Props) {
  const [char, setChar] = useState<CharacterCard>({ ...character });

  return (
    <div style={{
      background: 'var(--dreamy-input-bg)', border: `1px solid var(--dreamy-border-strong)`,
      borderRadius: 12, padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {FIELDS.map(({ key, label }) => (
          <div key={key} style={key === 'notes' || key === 'name' ? { gridColumn: '1 / -1' } : undefined}>
            <label style={{ fontFamily: FONT, fontSize: 11, fontWeight: 300, color: 'var(--dreamy-text-tertiary)', display: 'block', marginBottom: 2 }}>
              {label}
            </label>
            <input
              type="text"
              value={char[key] || ''}
              onChange={(e) => setChar({ ...char, [key]: e.target.value })}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-text-primary)',
                background: 'var(--dreamy-input-bg)', border: `1px solid var(--dreamy-border)`,
                borderRadius: 6, padding: '5px 8px', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          fontFamily: FONT, fontSize: 12, color: 'var(--dreamy-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px',
        }}>
          取消
        </button>
        <button onClick={() => onSave(char)} style={{
          fontFamily: FONT, fontSize: 12, color: 'var(--dreamy-text-primary)', background: 'var(--dreamy-btn-bg)',
          border: `1px solid var(--dreamy-border-strong)`, borderRadius: 20, cursor: 'pointer', padding: '4px 16px',
        }}>
          保存
        </button>
      </div>
    </div>
  );
}
