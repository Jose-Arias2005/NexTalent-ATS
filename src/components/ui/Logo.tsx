import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'contrast';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true
}) => {
  const isLight = variant === 'light';

  const sizes = {
    sm: { height: 32, text: '1.05rem', sub: '0.58rem', gap: 10, icon: 20 },
    md: { height: 42, text: '1.25rem', sub: '0.66rem', gap: 12, icon: 26 },
    lg: { height: 52, text: '1.5rem', sub: '0.75rem', gap: 14, icon: 32 }
  };

  const current = sizes[size];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: current.gap, userSelect: 'none' }}>
      {/* Dynamic Modern Vector Emblem */}
      <div
        style={{
          height: current.height,
          width: current.height,
          borderRadius: 10,
          background: isLight
            ? 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)'
            : 'linear-gradient(135deg, #0A1120 0%, #0052CC 100%)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 14px rgba(0, 82, 204, 0.25)',
          border: isLight ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0, 82, 204, 0.3)',
          flexShrink: 0
        }}
      >
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 16L16 6L26 16L16 26L6 16Z"
            stroke={isLight ? '#FFFFFF' : '#00A3E0'}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M16 10L22 16L16 22L10 16L16 10Z"
            fill={isLight ? '#00A3E0' : '#0052CC'}
            fillOpacity="0.85"
          />
          <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--ats-font-heading, "Plus Jakarta Sans", sans-serif)',
              fontWeight: 800,
              fontSize: current.text,
              letterSpacing: '-0.02em',
              color: isLight ? '#FFFFFF' : 'var(--ats-navy, #0A1120)'
            }}
          >
            NEX
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: current.text,
              letterSpacing: '0.04em',
              color: isLight ? '#00A3E0' : 'var(--ats-blue, #0052CC)'
            }}
          >
            TALENT
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: isLight ? 'rgba(0, 163, 224, 0.25)' : 'rgba(0, 82, 204, 0.1)',
              color: isLight ? '#00A3E0' : '#0052CC',
              letterSpacing: '0.06em'
            }}
          >
            ATS
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: current.sub,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isLight ? '#94A3B8' : 'var(--ats-text-muted, #64748B)'
            }}
          >
            Executive Talent Platform
          </span>
        )}
      </div>
    </div>
  );
};
