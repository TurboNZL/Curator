import React from 'react';
import { Sidebar } from './Sidebar';
import { TopToolbar } from './TopToolbar';
import { BottomPlayer } from './BottomPlayer';
import { Outlet } from 'react-router-dom';

export const AppShell = () => {
  return (
    <div className="flex h-screen bg-black text-zinc-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <TopToolbar />
        {/* Main content area, adjusted for player height */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-8 pb-[10rem] relative"> 
          <Outlet />
        </main>
        <BottomPlayer />
      </div>
    </div>
  );
};