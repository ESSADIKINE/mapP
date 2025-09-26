import React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'gold' | 'navy' | 'muted';
}

const toneMap = {
  gold: 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/40',
  navy: 'bg-secondary-500/30 text-primary-100 ring-1 ring-secondary-400/40',
  muted: 'bg-white/10 text-white/60 ring-1 ring-white/15'
};

export const Badge: React.FC<BadgeProps> = ({ className, children, tone = 'gold', ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em]',
      toneMap[tone],
      className
    )}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;
