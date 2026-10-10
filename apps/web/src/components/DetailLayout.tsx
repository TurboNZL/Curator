import type { ReactNode } from 'react';

/**
 * Album / artist / era pages: the content in the middle and the supporting panels (releases, bios, notes) on its
 * sides on wide screens, so they are not buried under a long track list. Below `xl` everything stacks, side
 * panels after the content.
 */
export function DetailLayout({ left, right, children }: { left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  // xl: content + ONE side column (releases above bios and notes); 2xl: releases get a column of their own on the left
  const cols = left && right ? 'xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-[auto_1fr] 2xl:grid-cols-[16rem_minmax(0,1fr)_20rem] 2xl:grid-rows-none' : right ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : left ? 'xl:grid-cols-[16rem_minmax(0,1fr)]' : '';
  const both = left && right;
  return (
    <div className={`grid items-start gap-x-6 gap-y-6 ${cols}`}>
      {left && <aside className={`space-y-6 ${both ? 'xl:col-start-2 xl:row-start-1 2xl:col-start-1' : 'xl:order-1'} 2xl:sticky 2xl:top-20 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto`}>{left}</aside>}
      <div className={`min-w-0 space-y-6 ${both ? 'xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:col-start-2 2xl:row-span-1' : 'xl:order-2'}`}>{children}</div>
      {right && <aside className={`space-y-6 ${both ? 'xl:col-start-2 xl:row-start-2 2xl:col-start-3 2xl:row-start-1' : 'xl:order-3'} xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto`}>{right}</aside>}
    </div>
  );
}
