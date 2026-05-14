import React from 'react';
import { Sidebar } from './Sidebar';
import { TopToolbar } from './TopToolbar';
import { BottomPlayer } from './BottomPlayer';
import { SpeedDial } from '@/components/ui/SpeedDial';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-black text-zinc-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopToolbar />
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-8 relative">
          {children}
          <SpeedDial />
        </main>
        <BottomPlayer />
      </div>
    </div>
  );
};