import React, { useId, useState } from 'react';

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export const Provider: React.FC<TooltipProviderProps> = ({ children }) => <>{children}</>;

interface TooltipContextValue {
  labelId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export interface TooltipProps {
  children: React.ReactNode;
}

export const Root: React.FC<TooltipProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  return (
    <TooltipContext.Provider value={{ labelId, open, setOpen }}>{children}</TooltipContext.Provider>
  );
};

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const Trigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ children, asChild = false, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest }, ref) => {
    const context = React.useContext(TooltipContext);
    if (!context) throw new Error('Tooltip.Trigger must be used within Tooltip.Root');

    const handleMouseEnter: React.MouseEventHandler<HTMLElement> = (event) => {
      onMouseEnter?.(event);
      context.setOpen(true);
    };
    const handleMouseLeave: React.MouseEventHandler<HTMLElement> = (event) => {
      onMouseLeave?.(event);
      context.setOpen(false);
    };
    const handleFocus: React.FocusEventHandler<HTMLElement> = (event) => {
      onFocus?.(event);
      context.setOpen(true);
    };
    const handleBlur: React.FocusEventHandler<HTMLElement> = (event) => {
      onBlur?.(event);
      context.setOpen(false);
    };

    const triggerProps = {
      ref,
      'aria-describedby': context.open ? context.labelId : undefined,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      ...rest
    } as any;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, triggerProps);
    }

    return (
      <span {...triggerProps}>
        {children}
      </span>
    );
  }
);
Trigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Content = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, side = 'top', style, ...rest }, ref) => {
    const context = React.useContext(TooltipContext);
    if (!context) throw new Error('Tooltip.Content must be used within Tooltip.Root');
    if (!context.open) return null;

    const positionalStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      transform: 'translate(-50%, -100%)',
      ...(side === 'bottom' ? { transform: 'translate(-50%, 0)' } : {}),
      ...(side === 'left' ? { transform: 'translate(-100%, -50%)' } : {}),
      ...(side === 'right' ? { transform: 'translate(0, -50%)' } : {})
    };

    return (
      <div
        ref={ref}
        role="tooltip"
        id={context.labelId}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          fontSize: '0.75rem',
          borderRadius: '0.375rem',
          padding: '0.35rem 0.55rem',
          backdropFilter: 'blur(4px)',
          ...positionalStyle,
          ...style
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Content.displayName = 'TooltipContent';

export default {
  Provider,
  Root,
  Trigger,
  Content
};
