import React, { useEffect, useId, useRef, useState } from 'react';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  labelId: string;
  menuRef: React.RefObject<HTMLDivElement>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const Root: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen, labelId, menuRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
};

export interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Trigger = React.forwardRef<HTMLElement, DropdownTriggerProps>(
  ({ children, asChild = false, onClick, ...rest }, ref) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownMenu.Trigger must be used within DropdownMenu.Root');

    const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
      onClick?.(event as any);
      if (!event.defaultPrevented) {
        context.setOpen(!context.open);
      }
    };

    const triggerProps = {
      ref,
      id: context.labelId,
      'aria-haspopup': 'menu',
      'aria-expanded': context.open,
      onClick: handleClick,
      ...rest
    } as any;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, triggerProps);
    }

    return (
      <button type="button" {...triggerProps}>
        {children}
      </button>
    );
  }
);
Trigger.displayName = 'DropdownTrigger';

export interface DropdownContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

export const Content = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ children, className = '', align = 'start', style, ...rest }, ref) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownMenu.Content must be used within DropdownMenu.Root');
    if (!context.open) return null;

    const setRef = (node: HTMLDivElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      context.menuRef.current = node;
    };

    return (
      <div
        ref={setRef}
        role="menu"
        aria-labelledby={context.labelId}
        className={`min-w-[10rem] rounded-xl border border-white/10 bg-[#001F3F]/95 text-white shadow-lg backdrop-blur-md ${className}`}
        style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', ...style, ...(align === 'center' ? { left: '50%', transform: 'translateX(-50%)' } : align === 'end' ? { right: 0 } : { left: 0 }) }}
        {...rest}
      >
        <div className="py-1" role="none">
          {children}
        </div>
      </div>
    );
  }
);
Content.displayName = 'DropdownContent';

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

export const Item = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, className = '', inset = false, ...rest }, ref) => (
    <button
      ref={ref}
      role="menuitem"
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 focus:bg-white/20 focus:outline-none ${
        inset ? 'pl-9' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
);
Item.displayName = 'DropdownItem';

export default {
  Root,
  Trigger,
  Content,
  Item
};
