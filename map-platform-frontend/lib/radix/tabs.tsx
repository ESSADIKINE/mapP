import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';

type Orientation = 'horizontal' | 'vertical';

type RovingFocusItem = {
  id: string;
  ref: React.RefObject<HTMLButtonElement>;
};

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  orientation: Orientation;
  baseId: string;
  items: React.MutableRefObject<RovingFocusItem[]>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tabs.Root />`);
  }
  return context;
}

export interface TabsRootProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: Orientation;
}

export const Root = React.forwardRef<HTMLDivElement, TabsRootProps>(
  ({ value, defaultValue, onValueChange, orientation = 'horizontal', children, ...rest }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    const items = useRef<RovingFocusItem[]>([]);
    const baseId = useId();

    const currentValue = value ?? internalValue;

    const setValue = useCallback(
      (next: string) => {
        if (value === undefined) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
      [value, onValueChange]
    );

    const register = useCallback((item: RovingFocusItem) => {
      items.current = [...items.current.filter((entry) => entry.id !== item.id), item];
    }, []);

    const unregister = useCallback((id: string) => {
      items.current = items.current.filter((entry) => entry.id !== id);
    }, []);

    const context = useMemo<TabsContextValue>(
      () => ({ value: currentValue, setValue, orientation, baseId, items }),
      [currentValue, setValue, orientation, baseId]
    );

    useEffect(() => {
      if (!currentValue && items.current[0]) {
        setValue(items.current[0].id);
      }
    }, [currentValue, setValue]);

    return (
      <TabsContext.Provider value={context}>
        <div ref={ref} data-orientation={orientation} {...rest}>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            if (child.type === List) {
              return React.cloneElement(child, { register, unregister } as any);
            }
            return child;
          })}
        </div>
      </TabsContext.Provider>
    );
  }
);
Root.displayName = 'TabsRoot';

interface InternalListProps {
  register?: (item: RovingFocusItem) => void;
  unregister?: (id: string) => void;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
}

export const List = React.forwardRef<HTMLDivElement, TabsListProps & InternalListProps>(
  ({ children, orientation, register, unregister, ...rest }, ref) => {
    const context = useTabsContext('Tabs.List');
    const finalOrientation = orientation ?? context.orientation;

    const enhancedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      if ((child.type as any).displayName === Trigger.displayName) {
        return React.cloneElement(child, { register, unregister } as any);
      }
      return child;
    });

    return (
      <div ref={ref} role="tablist" aria-orientation={finalOrientation} {...rest}>
        {enhancedChildren}
      </div>
    );
  }
);
List.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  register?: (item: RovingFocusItem) => void;
  unregister?: (id: string) => void;
}

export const Trigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, register, unregister, onKeyDown, onClick, children, ...rest }, ref) => {
    const context = useTabsContext('Tabs.Trigger');
    const localRef = useRef<HTMLButtonElement>(null);
    const combinedRef = mergeRefs(ref, localRef);

    useEffect(() => {
      register?.({ id: value, ref: localRef });
      return () => unregister?.(value);
    }, [register, unregister, value]);

    const isActive = context.value === value;
    const tabId = `${context.baseId}-tab-${value}`;
    const panelId = `${context.baseId}-panel-${value}`;

    const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const isHorizontal = context.orientation === 'horizontal';
      const forwards = isHorizontal ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
      const backwards = isHorizontal ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';

      if (forwards || backwards) {
        event.preventDefault();
        const delta = forwards ? 1 : -1;
        moveFocus(context, value, delta);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        focusItem(context, 0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        focusItem(context, -1);
      }
    };

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        context.setValue(value);
      }
    };

    return (
      <button
        ref={combinedRef}
        type="button"
        role="tab"
        id={tabId}
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={isActive ? 0 : -1}
        data-state={isActive ? 'active' : 'inactive'}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Trigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const Content = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, hidden, style, ...rest }, ref) => {
    const context = useTabsContext('Tabs.Content');
    const isActive = context.value === value;
    const tabId = `${context.baseId}-tab-${value}`;
    const panelId = `${context.baseId}-panel-${value}`;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        hidden={hidden ?? !isActive}
        data-state={isActive ? 'active' : 'inactive'}
        style={{ ...style, display: hidden ?? !isActive ? 'none' : 'block' }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Content.displayName = 'TabsContent';

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

function moveFocus(context: TabsContextValue, currentId: string, delta: number) {
  const items = context.items.current;
  const currentIndex = items.findIndex((item) => item.id === currentId);
  if (currentIndex === -1) return;
  const nextIndex = (currentIndex + delta + items.length) % items.length;
  focusItem(context, nextIndex);
}

function focusItem(context: TabsContextValue, index: number) {
  const items = context.items.current;
  if (!items.length) return;
  const target = index === -1 ? items[items.length - 1] : items[index];
  if (target?.ref.current) {
    target.ref.current.focus();
    context.setValue(target.id);
  }
}

export default {
  Root,
  List,
  Trigger,
  Content
};
