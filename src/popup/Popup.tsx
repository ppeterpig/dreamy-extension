import { FONT } from '../shared/constants';

export default function Popup() {
  return (
    <div style={{
      width: 300, height: 163,
      background: 'var(--dreamy-bg)',
      border: `1px solid var(--dreamy-border)`,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT,
    }}>
      {/* Title */}
      <p style={{
        position: 'absolute',
        top: 30, left: 34,
        margin: 0,
        fontSize: 16, fontWeight: 400,
        color: 'var(--dreamy-text-primary)',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        fontFamily: FONT,
      }}>
        <span style={{ fontFamily: '"Roboto", sans-serif', fontWeight: 700 }}>Dreamy</span>
        <span>-文字可视化阅读工具</span>
      </p>

      {/* Divider */}
      <div style={{
        position: 'absolute',
        top: 61, left: '50%', transform: 'translateX(-50%)',
        width: 232, height: 1,
        background: 'var(--dreamy-btn-bg)',
      }} />

      {/* Body */}
      <div style={{
        position: 'absolute',
        top: 83, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontSize: 11, fontWeight: 400, color: 'var(--dreamy-text-secondary)',
        lineHeight: '17px',
        fontFamily: FONT,
      }}>
        <span>选中书中文本，一键生成插画</span>
        <span>打造沉浸式阅读体验</span>
      </div>

      {/* Footer */}
      <p style={{
        position: 'absolute',
        top: 132, left: '50%', transform: 'translateX(-50%)',
        margin: 0,
        fontSize: 9, fontWeight: 300,
        color: 'var(--dreamy-text-tertiary)',
        letterSpacing: '0.18px',
        fontFamily: FONT,
        whiteSpace: 'nowrap',
      }}>
        Hover页面右下角的icon，体验更多功能
      </p>
    </div>
  );
}
