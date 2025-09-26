import React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  viewportClassName?: string;
}

export const Root = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className = '', viewportClassName = '', orientation = 'vertical', ...rest }, ref) => {
    const overflowY = orientation === 'horizontal' ? 'overflow-y-hidden' : 'overflow-y-auto';
    const overflowX = orientation === 'vertical' ? 'overflow-x-hidden' : 'overflow-x-auto';

    return (
      <div ref={ref} className={`relative ${className}`} {...rest}>
        <div className={`max-h-full max-w-full ${overflowX} ${overflowY} pr-2 ${viewportClassName}`}>{children}</div>
      </div>
    );
  }
);
Root.displayName = 'ScrollAreaRoot';

export const Viewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...rest }, ref) => <div ref={ref} className={className} {...rest} />
);
Viewport.displayName = 'ScrollAreaViewport';

export default {
  Root,
  Viewport
};
