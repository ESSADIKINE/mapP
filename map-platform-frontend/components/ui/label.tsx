import React from 'react';
import { cn } from '@/lib/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  hint?: string;
}

export const Label: React.FC<LabelProps> = ({ className, children, hint, ...rest }) => (
  <label className={cn('flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60', className)} {...rest}>
    <span>{children}</span>
    {hint ? <span className="text-[0.65rem] font-normal uppercase tracking-[0.15em] text-white/35">{hint}</span> : null}
  </label>
);

export default Label;
