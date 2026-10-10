import { useNavigate } from 'react-router-dom';
import { Disc, FileAudio, ListEnd, ListStart, Pencil, Play, Plus, Shuffle, User, Layers } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useLibrary, type Library } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { planConvertToSingle } from '../lib/albumOps.ts';
import { useStore } from '../lib/store.ts';
import type { MenuItem } from './Menu.tsx';

/** What a menu does to a list of tracks: play it, shuffle it (with the playback rules), queue it. */
function useTrackListActions() {
  const lib = useLibrary();
  const play = usePlayer((s) => s.play);
  const enqueue = usePlayer((s) => s.enqueue);
  return (ids: string[], source: Parameters<typeof play>[2]): MenuItem[] => {
    const playable = ids.filter((id) => lib.trackById.get(id)?.file);
    const none = !playable.length;
    return [
      { label: 'Play', icon: <Play size={15} />, run: () => play(playable[0], playable, source), disabled: none },
      { label: 'Shuffle', icon: <Shuffle size={15} />, run: () => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, source); }, disabled: none },
      // each goes right after the one before it, so "next" keeps the list's order
      { label: 'Play next', icon: <ListStart size={15} />, run: () => [...playable].reverse().forEach((id) => enqueue(id, 'next')), disabled: none },
      { label: 'Add to queue', icon: <ListEnd size={15} />, run: () => playable.forEach((id) => enqueue(id, 'last')), disabled: none },
    ];
  };
}

type Album = Library['albums'][number];

/** Turns an album that is really one song into a single (after asking). Returns false when the album is not eligible. */
export function useConvertToSingle() {
  const lib = useLibrary();
  const { patch, remove } = useStore.getState();
  const nav = useNavigate();
  return (album: Album) => {
    const plan = planConvertToSingle(lib, album);
    if (!plan) return false;
    const t = lib.trackById.get(plan.trackId)!;
    if (!confirm(`Turn “${album.title}” into a single?\n\n“${t.title}” keeps its cover, credits and genres and leaves the album. The album and its ${plan.removeReleaseIds.length} release${plan.removeReleaseIds.length === 1 ? '' : 's'} are deleted (other releases' covers are lost).`)) return true;
    patch('tracks', plan.trackId, plan.trackPatch);
    for (const r of plan.removeReleaseIds) remove('releases', r);
    remove('albums', plan.removeAlbumId);
    nav('/singles');
    return true;
  };
}

/** The right-click / ⋯ menu of an album (cards, the album page). `ids` overrides the tracks when a release is being viewed. */
export function useAlbumMenuItems() {
  const edit = useEditor((s) => s.open);
  const actions = useTrackListActions();
  const lib = useLibrary();
  const convert = useConvertToSingle();
  return (album: Album, ids: string[] = album.trackIds): MenuItem[] => [
    ...actions(ids, { type: 'album', id: album.id }),
    { separator: true },
    { label: 'Edit album…', icon: <Pencil size={15} />, run: () => edit({ kind: 'album', id: album.id }) },
    { label: 'Add audio files…', icon: <FileAudio size={15} />, run: () => edit({ kind: 'upload', id: album.id }) },
    { label: 'New release…', icon: <Plus size={15} />, run: () => edit({ kind: 'new-release', id: album.id }) },
    ...(planConvertToSingle(lib, album) ? [{ label: 'Convert to a single…', icon: <Disc size={15} />, run: () => convert(album) }] : []),
    { separator: true },
    ...album.leads.map((l) => ({ label: `Go to ${l.name}`, icon: <User size={15} />, to: `/artists/${l.id}` })),
    ...(album.eraId ? [{ label: 'Go to its era', icon: <Layers size={15} />, to: `/eras/${album.eraId}` }] : []),
  ];
}

/** The menu of an artist: everything they are credited on. */
export function useArtistMenuItems() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const actions = useTrackListActions();
  return (artistId: string): MenuItem[] => {
    const ids = lib.tracks.filter((t) => t.credits.some((c) => c.artistId === artistId)).sort((a, b) => b.effectiveRating - a.effectiveRating).map((t) => t.id);
    return [
      ...actions(ids, { type: 'search', id: null }),
      { separator: true },
      { label: 'Edit artist…', icon: <Pencil size={15} />, run: () => edit({ kind: 'artist', id: artistId }) },
    ];
  };
}
