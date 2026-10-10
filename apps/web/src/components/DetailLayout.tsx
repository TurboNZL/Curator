import type { ReactNode } from 'react';

/**
 * Album / artist / era pages: the content in the middle and the supporting panels (releases, bios, notes) on its
 * sides on wide screens, so they are not buried under a long track list. Below `xl` everything stacks, side
 * panels after the content.
 */
export function DetailLayout({ left, right, children }: { left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const cols = left && right ? 'xl:grid-cols-[16rem_minmax(0,1fr)_20rem]' : right ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : left ? 'xl:grid-cols-[16rem_minmax(0,1fr)]' : '';
  return (
    <div className={`grid items-start gap-6 ${cols}`}>
      {left && <aside className="space-y-6 xl:sticky xl:top-20 xl:order-1 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">{left}</aside>}
      <div className="min-w-0 space-y-6 xl:order-2">{children}</div>
      {right && <aside className="space-y-6 xl:sticky xl:top-20 xl:order-3 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">{right}</aside>}
    </div>
  );
}
