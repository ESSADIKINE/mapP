import React from 'react';
import { cn } from '@/lib/cn';

export interface AppShellProps {
  header: React.ReactNode;
  leftSidebar: React.ReactNode;
  main: React.ReactNode;
  rightSidebar: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ header, leftSidebar, main, rightSidebar }) => {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-6 py-10 md:px-10 lg:px-16">
      <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-[540px] max-w-5xl rounded-full bg-primary-500/15 blur-3xl" />
      {header}
      <div className={cn('grid flex-1 gap-6', 'xl:grid-cols-[360px_minmax(0,1fr)_420px]', 'lg:grid-cols-[320px_minmax(0,1fr)]', 'lg:[&>aside:last-child]:col-span-2', 'max-lg:flex max-lg:flex-col')}
      >
        <aside className="xl:sticky xl:top-24">{leftSidebar}</aside>
        <main className="min-h-[520px]">{main}</main>
        <aside className="xl:sticky xl:top-24">{rightSidebar}</aside>
      </div>
    </div>
  );
};

export default AppShell;
