'use client';

import React from 'react';
import AppShell from '@/components/layout/app-shell';
import TopBar from '@/components/layout/top-bar';
import PlaceList from '@/components/places/place-list';
import PlaceDetailPanel from '@/components/places/place-detail-panel';
import StudioStage from '@/components/studio/studio-stage';

export default function HomePage() {
  return (
    <AppShell
      header={<div className="animate-slideUp"><TopBar /></div>}
      leftSidebar={<div className="animate-slideUp" style={{ animationDelay: '120ms' }}><PlaceList /></div>}
      main={<div className="animate-slideUp" style={{ animationDelay: '220ms' }}><StudioStage /></div>}
      rightSidebar={<div className="animate-slideUp" style={{ animationDelay: '320ms' }}><PlaceDetailPanel /></div>}
    />
  );
}
