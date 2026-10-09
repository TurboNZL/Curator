import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { useStore } from './lib/store.ts';
import { HomePage } from './pages/Home.tsx';
import { BiosPage } from './pages/BiosPage.tsx';
import { AlbumsPage } from './pages/Albums.tsx';
import { AlbumPage } from './pages/Album.tsx';
import { ArtistsPage } from './pages/Artists.tsx';
import { ArtistPage } from './pages/Artist.tsx';
import { TracksPage } from './pages/Tracks.tsx';
import { VotePage } from './pages/Vote.tsx';
import { QueuePage } from './pages/Queue.tsx';
import { PlaylistsPage } from './pages/Playlists.tsx';
import { SearchPage } from './pages/Search.tsx';
import { StatsPage } from './pages/Stats.tsx';
import { SettingsPage } from './pages/Settings.tsx';

export function App() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  useEffect(() => { void init(); }, [init]);
  if (!ready) return <div className="p-8 text-muted">Loading library…</div>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="bios" element={<BiosPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistPage />} />
        <Route path="tracks" element={<TracksPage />} />
        <Route path="vote" element={<VotePage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<div className="p-8 text-muted">Nothing here.</div>} />
      </Route>
    </Routes>
  );
}
