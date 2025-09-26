import React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const baseStyles = 'inline-flex items-center justify-center rounded-full font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary-500 text-secondary-foreground shadow-glow hover:bg-primary-400 hover:shadow-lg focus:ring-primary-200',
  secondary: 'bg-secondary-500 text-primary-500 shadow-panel hover:bg-secondary-400 focus:ring-secondary-200',
  ghost: 'bg-white/5 text-white hover:bg-white/10 focus:ring-primary-200'
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-12 px-8 text-lg'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...rest }, ref) => (
    <button ref={ref} className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...rest}>
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export default Button;
