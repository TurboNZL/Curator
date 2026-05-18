import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import Tracks from './pages/Tracks';
import Cleanup from './pages/Cleanup';
import Settings from './pages/Settings';
import Index from './pages/Index';
import Stats from './pages/Stats';
import Playlists from './pages/Playlists'; // Import Playlists page

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Index />} />
        <Route path="artists" element={<Artists />} />
        <Route path="artists/:id" element={<ArtistDetail />} />
        <Route path="albums" element={<Albums />} />
        <Route path="albums/:id" element={<AlbumDetail />} />
        <Route path="tracks" element={<Tracks />} />
        <Route path="playlists" element={<Playlists />} /> {/* New Playlists route */}
        <Route path="cleanup" element={<Cleanup />} />
        <Route path="settings" element={<Settings />} />
        <Route path="stats" element={<Stats />} />
      </Route>
    </Routes>
  );
}

export default App;