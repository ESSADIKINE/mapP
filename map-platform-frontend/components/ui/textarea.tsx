import React from 'react';
import { cn } from '@/lib/cn';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const baseStyles =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300/70 disabled:cursor-not-allowed disabled:opacity-60';

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cn(baseStyles, 'min-h-[120px]', className)} {...rest} />
));
TextArea.displayName = 'TextArea';

export default TextArea;
