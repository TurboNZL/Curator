import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AlbumData, ArtistData, GroupData, ReleaseData, GroupMemberData, PlaybackRule, ProfileData, TrackData } from '@curator/core';
import { resolveEntity } from '../lib/entities.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { useStore } from '../lib/store.ts';
import { TrackDetails } from './TrackDetails.tsx';
import { ImportDialog } from './ImportDialog.tsx';
import { logJournal } from '../lib/journal.ts';
import { newAlbumData, newTrackData, appendTrack, moveTrack, removeTrack } from '../lib/defaults.ts';
import { ArtistSelect, CreditsEditor, EntityPicker, Field, ImagePicker, Modal, TagInput, TrackPicker } from './forms.tsx';

/** Make sure every genre name used exists as a genre record, so it shows up in filters and suggestions. */
function useEnsureGenres() {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  return (names: string[]) => {
    const known = new Set(lib.genres.map((g) => g.name.toLowerCase()));
    for (const n of names) if (!known.has(n.toLowerCase())) { put('genres', { name: n }); known.add(n.toLowerCase()); }
  };
}

/** Make sure every role name used exists as a role category record. */
function useEnsureRoles() {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  return (credits: { role: string[] }[]) => {
    const known = new Set(lib.roles.map((r) => r.name.toLowerCase()));
    for (const n of credits.flatMap((c) => c.role)) if (!known.has(n.toLowerCase())) { put('roleCategories', { name: n, isRemovable: true }); known.add(n.toLowerCase()); }
  };
}

/** the stored record (no derived fields like rating), which is what edits must be based on */
const raw = <T,>(table: 'tracks' | 'albums' | 'artists', id: string) => useStore.getState().rows[table].get(id)?.data as T | undefined;

const numOrNull = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s));

function TrackEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, patch, remove } = useStore();
  const ensureGenres = useEnsureGenres();
  const ensureRoles = useEnsureRoles();
  const track = lib.trackById.get(id);
  const rule = lib.rules.find((r) => r.trackAId === id);
  const [t, setT] = useState<TrackData | null>(() => raw<TrackData>('tracks', id) ?? null);
  const [after, setAfter] = useState<string | null>(rule?.trackBId ?? null);
  const [first, setFirst] = useState(rule?.playFirstOnShuffle ?? true);
  const [albumOnly, setAlbumOnly] = useState(rule?.applyToAlbumSource ?? false);
  if (!track || !t) return null;
  const set = <K extends keyof TrackData>(k: K, v: TrackData[K]) => setT((p) => ({ ...p!, [k]: v }));

  function save() {
    const d = t!;
    if (!d.syncWithAlbumCredits) ensureGenres(d.genres ?? []);
    ensureRoles(d.credits ?? []);
    put('tracks', d, id);
    // playback rule lives on the profile: replace this track's rule
    const others = lib.rules.filter((r) => r.trackAId !== id);
    const rules: PlaybackRule[] = after ? [...others, { trackAId: id, trackBId: after, playFirstOnShuffle: first, applyToAlbumSource: albumOnly }] : others;
    if (rules.length !== lib.rules.length || after !== (rule?.trackBId ?? null) || first !== (rule?.playFirstOnShuffle ?? true) || albumOnly !== (rule?.applyToAlbumSource ?? false)) {
      if (lib.profile) patch('profiles', lib.profile.id, { playbackRules: rules });
      else put('profiles', { name: 'Main Curator', theme: 'dark', accentColor: '#3b82f6', playbackMode: 'local', settings: {}, playbackRules: rules } satisfies ProfileData, '1');
    }
    onClose();
  }

  return (
    <Modal title="Edit track" onClose={onClose} footer={<>
      <button className="btn text-bad" onClick={() => { if (confirm(`Delete “${track.title}”? Its votes stay in the history.`)) { remove('tracks', id); onClose(); } }}>Delete</button>
      <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-accent" onClick={save}>Save</button></div></>}>
      <Field label="Title"><input className="input" value={t.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Artist"><ArtistSelect value={t.artistId ?? ''} onChange={(v) => set('artistId', v)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Manual rating (0–10)" hint="A floor until votes take over"><input className="input" inputMode="decimal" value={t.initialRating ?? ''} onChange={(e) => set('initialRating', numOrNull(e.target.value))} /></Field>
        <Field label="BPM"><input className="input" inputMode="numeric" value={t.bpm ?? ''} onChange={(e) => set('bpm', numOrNull(e.target.value))} /></Field>
        <Field label="Key"><input className="input" value={t.key ?? ''} onChange={(e) => set('key', e.target.value || null)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!t.syncWithAlbumCredits} onChange={(e) => set('syncWithAlbumCredits', e.target.checked)} />Use the album's genres{track.albumTitle ? ` (${track.albumTitle})` : ''}</label>
      {!t.syncWithAlbumCredits && <Field label="Genres"><TagInput value={t.genres ?? []} onChange={(v) => set('genres', v)} suggestions={lib.genres.map((g) => g.name)} /></Field>}
      <Field label="YouTube Music URL" hint="Used to download the audio"><input className="input" value={t.youtubeMusicUrl ?? ''} onChange={(e) => set('youtubeMusicUrl', e.target.value || null)} /></Field>
      <Field label="Spotify URL"><input className="input" value={t.spotifyUrl ?? ''} onChange={(e) => set('spotifyUrl', e.target.value || null)} /></Field>
      <Field label="Genius URL"><input className="input" value={t.geniusUrl ?? ''} onChange={(e) => set('geniusUrl', e.target.value || null)} /></Field>
      <Field label="Credits"><CreditsEditor value={t.credits ?? []} onChange={(v) => set('credits', v)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!t.isFavorite} onChange={(e) => set('isFavorite', e.target.checked)} />Favourite</label>
      <div className="space-y-2 rounded-theme border border-line p-3">
        <div className="text-sm font-medium">Playback rule: play another track right after this one</div>
        <TrackPicker value={after} onChange={setAfter} exclude={id} />
        {after && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={first} onChange={(e) => setFirst(e.target.checked)} />Keep them together when shuffling</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={albumOnly} onChange={(e) => setAlbumOnly(e.target.checked)} />Only when playing from an album</label></>}
      </div>
    </Modal>
  );
}

function AlbumEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, remove } = useStore();
  const nav = useNavigate();
  const ensureGenres = useEnsureGenres();
  const ensureRoles = useEnsureRoles();
  const album = lib.albumById.get(id);
  const [a, setA] = useState<AlbumData | null>(() => raw<AlbumData>('albums', id) ?? null);
  if (!album || !a) return null;
  const set = <K extends keyof AlbumData>(k: K, v: AlbumData[K]) => setA((p) => ({ ...p!, [k]: v }));
  return (
    <Modal title="Edit album" onClose={onClose} footer={<>
      <button className="btn text-bad" onClick={() => { if (confirm(`Delete “${album.title}”? Its tracks stay in your library.`)) { remove('albums', id); onClose(); nav('/albums'); } }}>Delete</button>
      <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-accent" onClick={() => {
        ensureGenres(a.genres ?? []); ensureRoles(a.credits ?? []); put('albums', a, id); onClose();
      }}>Save</button></div></>}>
      <ImagePicker hash={a.cover ?? null} onChange={(h) => set('cover', h)} seed={album.title} />
      <Field label="Title"><input className="input" value={a.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Artist"><ArtistSelect value={a.artistId ?? ''} onChange={(v) => set('artistId', v)} /></Field>
      <Field label="Genres" hint="Tracks that use the album's genres follow these"><TagInput value={a.genres ?? []} onChange={(v) => set('genres', v)} suggestions={lib.genres.map((g) => g.name)} /></Field>
      <Field label="Credits"><CreditsEditor value={a.credits ?? []} onChange={(v) => set('credits', v)} /></Field>
    </Modal>
  );
}

function ArtistEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, remove } = useStore();
  const nav = useNavigate();
  const artist = lib.artistById.get(id);
  const [a, setA] = useState<ArtistData | null>(() => raw<ArtistData>('artists', id) ?? null);
  if (!artist || !a) return null;
  const used = lib.tracks.filter((t) => t.artistId === id).length + lib.albums.filter((x) => x.artistId === id).length;
  return (
    <Modal title="Edit artist" onClose={onClose} footer={<>
      <button className="btn text-bad" disabled={used > 0} title={used ? 'Still credited on tracks or albums' : ''} onClick={() => { if (confirm(`Delete ${artist.name}?`)) { remove('artists', id); onClose(); nav('/artists'); } }}>Delete</button>
      <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-accent" onClick={() => {
        put('artists', { ...a, name: a.name.trim() || artist.name }, id); onClose();
      }}>Save</button></div></>}>
      <ImagePicker kind="artist" hash={a.image ?? null} onChange={(h) => setA({ ...a, image: h })} seed={artist.name} />
      <Field label="Name"><input className="input" value={a.name ?? ''} onChange={(e) => setA({ ...a, name: e.target.value })} /></Field>
    </Modal>
  );
}

function NewAlbumDialog({ onClose }: { onClose: () => void }) {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  const nav = useNavigate();
  const ensureGenres = useEnsureGenres();
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState(lib.artists[0]?.id ?? '');
  const [genres, setGenres] = useState<string[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const ok = title.trim() && artistId;
  return (
    <Modal title="New album" onClose={onClose} footer={<div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-accent" disabled={!ok} onClick={() => { ensureGenres(genres); const id = put('albums', newAlbumData({ title: title.trim(), artistId, genres, cover })); logJournal('add', `Added album: ${title.trim()}`, lib.artistById.get(artistId)?.name ?? '', id); onClose(); nav(`/albums/${id}`); }}>Create</button></div>}>
      <ImagePicker hash={cover} onChange={setCover} seed={title || 'new'} />
      <Field label="Title"><input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Artist"><ArtistSelect value={artistId} onChange={setArtistId} /></Field>
      <Field label="Genres"><TagInput value={genres} onChange={setGenres} suggestions={lib.genres.map((g) => g.name)} /></Field>
    </Modal>
  );
}

function NewTrackDialog({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, patch } = useStore();
  const album = lib.albumById.get(albumId);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState(album?.artistId ?? lib.artists[0]?.id ?? '');
  const [yt, setYt] = useState('');
  const [sp, setSp] = useState('');
  if (!album) return null;
  const ok = title.trim() && artistId;
  return (
    <Modal title={`Add a track to ${album.title}`} onClose={onClose} footer={<div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-accent" disabled={!ok} onClick={() => {
        const id = put('tracks', newTrackData({ title: title.trim(), artistId, youtubeMusicUrl: yt.trim() || null, spotifyUrl: sp.trim() || null, albums: [{ albumId, order: album.trackIds.length }] }));
        patch('albums', albumId, { trackOrder: appendTrack(album.trackIds, id) });
        onClose();
      }}>Add track</button></div>}>
      <Field label="Title"><input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Artist"><ArtistSelect value={artistId} onChange={setArtistId} /></Field>
      <Field label="YouTube Music URL" hint="Lets the server download the audio"><input className="input" value={yt} onChange={(e) => setYt(e.target.value)} /></Field>
      <Field label="Spotify URL"><input className="input" value={sp} onChange={(e) => setSp(e.target.value)} /></Field>
    </Modal>
  );
}

const BIO_TYPES: GroupData['type'][] = ['relationship', 'collective', 'thematic', 'era'];

/** Create or edit a relational bio. `initial` pre-links an entity ("album:xyz") when started from its page. */
function BioDialog({ groupId, initial, onClose }: { groupId?: string; initial?: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, remove } = useStore();
  const existing = groupId ? lib.groups.find((g) => g.id === groupId) : undefined;
  const [g, setG] = useState<GroupData>(() => {
    if (existing) return { ...existing };
    const [t, i] = (initial ?? '').split(':');
    const pre: GroupMemberData[] = t && i ? [{ entityType: t as GroupMemberData['entityType'], entityId: i, showOnEntityPage: t !== 'track' }] : [];
    return { name: '', description: '', label: null, type: 'relationship', members: pre };
  });
  if (groupId && !existing) return null;
  const add = (e: { type: 'artist' | 'album' | 'track'; id: string }) =>
    !g.members.some((m) => m.entityType === e.type && m.entityId === e.id) && setG({ ...g, members: [...g.members, { entityType: e.type, entityId: e.id, showOnEntityPage: e.type !== 'track' }] });
  const ok = g.name.trim() && g.members.length > 0;
  return (
    <Modal title={groupId ? 'Edit relational bio' : 'New relational bio'} onClose={onClose} footer={<>
      {groupId && <button className="btn text-bad" onClick={() => { if (confirm(`Delete “${g.name}”?`)) { remove('groups', groupId); onClose(); } }}>Delete</button>}
      <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-accent" disabled={!ok} onClick={() => { const bid = put('groups', { ...g, name: g.name.trim(), label: g.label ?? g.name.trim(), description: g.description?.trim() || null }, groupId); if (!groupId) logJournal('bio', `New relational bio: ${g.name.trim()}`, '', bid); onClose(); }}>Save</button></div></>}>
      <Field label="Name"><input autoFocus className="input" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
      <Field label="Type"><select className="input" value={g.type} onChange={(e) => setG({ ...g, type: e.target.value })}>{BIO_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Description"><textarea className="input" rows={4} value={g.description ?? ''} onChange={(e) => setG({ ...g, description: e.target.value })} /></Field>
      <div className="space-y-2"><div className="text-sm text-muted">Linked ({g.members.length}), and whether the bio shows on that page</div>
        {g.members.map((m, i) => { const r = resolveEntity(lib, m.entityType, m.entityId); return (
          <div key={i} className="flex items-center gap-2 rounded-theme bg-raised px-3 py-2 text-sm">
            <span className="chip">{m.entityType}</span><span className="min-w-0 flex-1 truncate">{r?.label ?? '(deleted)'}</span>
            <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={m.showOnEntityPage} onChange={(e) => setG({ ...g, members: g.members.map((x, j) => (j === i ? { ...x, showOnEntityPage: e.target.checked } : x)) })} />show</label>
            <button type="button" aria-label="Unlink" className="text-muted hover:text-fg" onClick={() => setG({ ...g, members: g.members.filter((_, j) => j !== i) })}>×</button></div>); })}
        <EntityPicker onPick={add} /></div>
    </Modal>
  );
}

/** Create or edit a release (an edition of an album with its own tracklist, date and cover). */
function ReleaseDialog({ releaseId, albumId, onClose }: { releaseId?: string; albumId?: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, patch, remove } = useStore();
  const existing = releaseId ? lib.releases.find((r) => r.id === releaseId) : undefined;
  const album = lib.albumById.get(existing?.albumId ?? albumId ?? '');
  const [r, setR] = useState<ReleaseData | null>(() => existing ? { ...existing } : album ? { albumId: album.id, title: album.title, cover: null, releaseDate: null, trackIds: [...album.trackIds] } : null);
  if (!r || !album) return null;
  const live = r.trackIds.filter((id) => lib.trackById.has(id));
  const save = () => { put('releases', { ...r, trackIds: live }, releaseId); onClose(); };
  return (
    <Modal title={releaseId ? 'Edit release' : `New release of ${album.title}`} onClose={onClose} footer={<>
      {releaseId && <button className="btn text-bad" onClick={() => { if (confirm(`Delete release “${r.title}”?`)) { remove('releases', releaseId); onClose(); } }}>Delete</button>}
      <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-accent" disabled={!r.title.trim()} onClick={save}>Save</button></div></>}>
      <ImagePicker hash={r.cover} onChange={(h) => setR({ ...r, cover: h })} seed={r.title} />
      <Field label="Title"><input autoFocus className="input" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} /></Field>
      <Field label="Release date"><input type="date" className="input" value={r.releaseDate ?? ''} onChange={(e) => setR({ ...r, releaseDate: e.target.value || null })} /></Field>
      <div className="space-y-1"><div className="text-sm text-muted">Tracklist ({live.length})</div>
        {live.map((id, i) => (
          <div key={id} className="flex items-center gap-2 rounded-theme bg-raised px-3 py-1.5 text-sm"><span className="w-5 text-right text-xs text-muted">{i + 1}</span><span className="min-w-0 flex-1 truncate">{lib.trackById.get(id)!.title}</span>
            <button type="button" className="px-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Move up" disabled={i === 0} onClick={() => setR({ ...r, trackIds: moveTrack(live, i, i - 1) })}>↑</button>
            <button type="button" className="px-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Move down" disabled={i === live.length - 1} onClick={() => setR({ ...r, trackIds: moveTrack(live, i, i + 1) })}>↓</button>
            <button type="button" className="px-1 text-muted hover:text-bad" aria-label="Remove from release" onClick={() => setR({ ...r, trackIds: removeTrack(live, id) })}>×</button></div>))}
        <TrackPicker value={null} onChange={(id) => id && setR({ ...r, trackIds: appendTrack(live, id) })} /></div>
      {releaseId && <button className="btn" onClick={() => { patch('albums', album.id, { defaultReleaseId: releaseId, trackOrder: live }); onClose(); }}>Use this tracklist and edition as the album's default</button>}
    </Modal>
  );
}

export function EditorHost() {
  const { target, close } = useEditor();
  if (!target) return null;
  const key = `${target.kind}:${target.id}`;
  if (target.kind === 'track-details') return <TrackDetails key={key} id={target.id} onClose={close} />;
  if (target.kind === 'release') return <ReleaseDialog key={key} releaseId={target.id} onClose={close} />;
  if (target.kind === 'new-release') return <ReleaseDialog key={key} albumId={target.id} onClose={close} />;
  if (target.kind === 'import') return <ImportDialog key="import" onClose={close} />;
  if (target.kind === 'bio') return <BioDialog key={key} groupId={target.id} onClose={close} />;
  if (target.kind === 'new-bio') return <BioDialog key={key} initial={target.id} onClose={close} />;
  if (target.kind === 'new-album') return <NewAlbumDialog key="new-album" onClose={close} />;
  if (target.kind === 'new-track') return <NewTrackDialog key={key} albumId={target.id} onClose={close} />;
  if (target.kind === 'track') return <TrackEditor key={key} id={target.id} onClose={close} />;
  if (target.kind === 'album') return <AlbumEditor key={key} id={target.id} onClose={close} />;
  return <ArtistEditor key={key} id={target.id} onClose={close} />;
}
