import type { BoxState } from '../../shared/types';

import { FONT } from "../../shared/constants";

interface Props {
  state: BoxState;
  imageDataUrl: string;
  error: string | null;
  imgW: number;
  imgH: number;
  progress: number;
  onSave: () => void;
  onRegenerate: () => void;
}

export function ImageStage({ state, imageDataUrl, error, imgW, imgH, progress, onSave, onRegenerate }: Props) {
  const wrapperStyle: React.CSSProperties = {
    width: imgW, height: imgH, minWidth: imgW, minHeight: imgH,
    position: 'relative', overflow: 'hidden',
    margin: '0 20px', boxSizing: 'border-box',
    borderRadius: 16,
    background: 'var(--dreamy-input-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  if (state === 'initial') {
    return (
      <div style={wrapperStyle}>
        <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: 'var(--dreamy-text-secondary)', textAlign: 'center', lineHeight: 1.8, padding: '0 32px' }}>
          调整下方风格与情绪关键词
          <br />
          点击「生成画面」开始
        </p>
      </div>
    );
  }

  if (state === 'generating') {
    return (
      <div style={{ ...wrapperStyle, flexDirection: 'column', gap: 14 }}>
        <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 300, color: 'var(--dreamy-text-secondary)', margin: 0 }}>
          图片生成中...
        </p>
        {/* Progress bar */}
        <div style={{ width: 200, height: 3, background: 'var(--dreamy-progress-track)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'var(--dreamy-border-strong)',
            borderRadius: 2,
            transition: 'width 0.3s ease-out',
          }} />
        </div>
        {error && (
          <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 300, color: 'var(--dreamy-error)', margin: 0, padding: '0 16px' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle }}>
      <img
        src={imageDataUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
        className={state === 'revealing' ? 'animate-film-develop' : ''}
      />
      {state === 'done' && (
        <>
          <button onClick={onRegenerate} style={imgBtn('top: 8px; right: 8px')} title="重新生成">{iconRegen}</button>
          <button onClick={onSave} style={imgBtn('bottom: 8px; right: 8px')} title="保存">{iconSave}</button>
        </>
      )}
    </div>
  );
}

function imgBtn(posCSS: string): React.CSSProperties {
  const pos: Record<string, string> = {};
  posCSS.split(';').forEach((p) => { const [k, v] = p.split(':').map((x) => x.trim()); if (k && v) pos[k] = v; });
  return {
    position: 'absolute', ...pos,
    width: 30, height: 30, borderRadius: 15,
    border: '1px solid var(--dreamy-border-strong)',
    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)', color: '#FFFFFF',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 300, padding: 0,
  };
}

const iconRegen = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6M23 20v-6h-6"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const iconSave = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
