import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  className = '',
  style,
  ...props
}) => {
  const paddings = {
    none: '0',
    sm: '16px',
    md: '24px',
    lg: '32px'
  };

  return (
    <div
      className={`ats-card ${interactive ? 'ats-card-interactive' : ''} ${className}`}
      style={{ padding: paddings[padding], ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
