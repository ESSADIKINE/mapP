import React from 'react';

export interface AvatarRootProps extends React.HTMLAttributes<HTMLDivElement> {
  fallback?: React.ReactNode;
}

export const Root = React.forwardRef<HTMLDivElement, AvatarRootProps>(
  ({ children, fallback, className = '', ...rest }, ref) => (
    <div
      ref={ref}
      className={`relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-[#001F3F]/60 text-sm font-medium text-white ${className}`}
      {...rest}
    >
      {children ?? fallback}
    </div>
  )
);
Root.displayName = 'AvatarRoot';

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const Image = React.forwardRef<HTMLImageElement, AvatarImageProps>((props, ref) => (
  <img ref={ref} className="h-full w-full object-cover" {...props} />
));
Image.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Fallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>((props, ref) => (
  <span ref={ref} className="text-xs uppercase tracking-wide text-white" {...props} />
));
Fallback.displayName = 'AvatarFallback';

export default {
  Root,
  Image,
  Fallback
};
