import { FONT } from '../../shared/constants';

interface Props {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export function GenerateButton({ onClick, disabled }: Props) {
  return (
    <button
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(e);
      }}
      disabled={disabled}
      style={{
        fontFamily: FONT,
        fontSize: 13, fontWeight: 400, letterSpacing: '0.02em',
        color: 'var(--dreamy-text-primary)', background: 'var(--dreamy-btn-bg)',
        border: `1px solid var(--dreamy-btn-hover)`, borderRadius: 40,
        padding: '8px 20px', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.target as HTMLElement).style.background = 'var(--dreamy-btn-hover)'; }}
      onMouseLeave={(e) => { if (!disabled) (e.target as HTMLElement).style.background = 'var(--dreamy-btn-bg)'; }}
    >
      生成画面
    </button>
  );
}
