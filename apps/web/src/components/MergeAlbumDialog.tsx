import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import type { TrackData } from '@turbomusic/core';
import { useLibrary } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';
import { logJournal } from '../lib/journal.ts';
import { planMergeAlbumInto } from '../lib/albumOps.ts';
import { eraPatches } from '../lib/eraOps.ts';
import { Select } from './Select.tsx';
import { Field, Modal } from './forms.tsx';
import { useNavigate } from 'react-router-dom';

/** Put an album that has only one release into another album, as a release of it (a deluxe edition that was imported on its own). */
export function MergeAlbumDialog({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const lib = useLibrary();
  const nav = useNavigate();
  const source = lib.albumById.get(albumId);
  const [targetId, setTargetId] = useState('');
  if (!source) return null;
  const target = lib.albumById.get(targetId);
  const raw = (id: string) => useStore.getState().rows.tracks.get(id)?.data as TrackData | undefined;
  const plan = target ? planMergeAlbumInto(lib, source, target, raw) : null;
  const options = lib.albums.filter((a) => a.id !== source.id).sort((a, b) => a.title.localeCompare(b.title))
    .map((a) => ({ value: a.id, label: a.title, hint: `${a.artistName} · ${a.trackIds.length} tracks` }));

  const run = () => {
    if (!plan || !target) return;
    const { patch, put, remove } = useStore.getState();
    const name = plan.newRelease.title.trim();
    if (name && !lib.releaseNames.some((n) => n.name.toLowerCase() === name.toLowerCase())) put('releaseNames', { name });
    for (const t of plan.trackPatches) patch('tracks', t.id, t.patch);
    put('releases', plan.newRelease);
    patch('albums', target.id, plan.targetPatch);
    for (const p of plan.playlistPatches) patch('playlists', p.id, { albumIds: p.albumIds });
    for (const g of plan.noteMembers) patch('groups', g.id, { members: g.members });
    for (const e of eraPatches(lib, 'album', source.id, [])) patch('eras', e.id, e.patch);
    for (const e of eraPatches(lib, 'album', target.id, plan.eraIds)) patch('eras', e.id, e.patch);
    remove('releases', plan.removeReleaseId);
    remove('albums', plan.removeAlbumId);
    logJournal('edit', `Moved “${source.title}” into ${target.title}`, `as a release of ${target.title}`, target.id);
    onClose();
    nav(`/albums/${target.id}`);
  };
  return (
    <Modal title={`Add “${source.title}” to another album`} onClose={onClose} footer={<div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-accent" disabled={!plan} onClick={run}><GitMerge size={15} />Move it</button></div>}>
      <p className="text-sm text-muted">This album has one release, so it can become a release of another album (for example a deluxe edition imported on its own).</p>
      <Field label="Add it to"><Select value={targetId} onChange={setTargetId} searchable placeholder="Choose an album…" options={options} /></Field>
      {plan && <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">{plan.summary.map((x) => <li key={x}>{x}</li>)}</ul>}
    </Modal>
  );
}
