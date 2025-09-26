import React from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

export const Card: React.FC<CardProps> = ({ className, children, padding = 'md', ...rest }) => (
  <div
    className={cn('glass-panel relative overflow-hidden rounded-3xl border border-white/5', paddingMap[padding], className)}
    {...rest}
  >
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/4 via-white/0 to-white/0" />
    <div className="relative z-10 h-full w-full">{children}</div>
  </div>
);

export default Card;
