import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Music, Disc, UserCircle, ListMusic } from 'lucide-react';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tracks, artists, albums, playlists } = useMusicStore();
  const query = new URLSearchParams(location.search).get('q') || '';

  const results = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return {
      tracks: tracks.filter(t => t.title.toLowerCase().includes(q)),
      artists: artists.filter(a => a.name.toLowerCase().includes(q)),
      albums: albums.filter(al => al.title.toLowerCase().includes(q)),
      playlists: playlists.filter(p => p.name.toLowerCase().includes(q)),
    };
  }, [query, tracks, artists, albums, playlists]);

  if (!results) return null;

  const topResult = [
    ...results.artists.map(a => ({ ...a, type: 'artist' })),
    ...results.albums.map(al => ({ ...al, type: 'album' })),
    ...results.tracks.map(t => ({ ...t, type: 'track' })),
    ...results.playlists.map(p => ({ ...p, type: 'playlist' })),
  ].sort((a, b) => {
    const aName = (a as any).name || (a as any).title;
    const bName = (b as any).name || (b as any).title;
    if (aName.toLowerCase() === query.toLowerCase()) return -1;
    if (bName.toLowerCase() === query.toLowerCase()) return 1;
    return 0;
  })[0];

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Search Results</h1>
        <p className="text-zinc-500 text-sm mt-1">Showing results for "{query}"</p>
      </div>

      {topResult && (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Result</h2>
          <Card 
            onClick={() => {
              if (topResult.type === 'artist') navigate(`/artists/${topResult.id}`);
              if (topResult.type === 'album') navigate(`/albums/${topResult.id}`);
              if (topResult.type === 'playlist') navigate(`/playlists`);
            }}
            className="bg-zinc-900/50 border-zinc-800 p-8 flex items-center gap-8 cursor-pointer hover:bg-zinc-900 transition-colors group"
          >
            <div className={cn(
              "w-48 h-48 shadow-2xl overflow-hidden",
              topResult.type === 'artist' ? "rounded-full" : "rounded-2xl"
            )}>
              {(topResult as any).image || (topResult as any).covers?.[0] ? (
                <img src={(topResult as any).image || (topResult as any).covers[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  {topResult.type === 'artist' ? <UserCircle size={64} className="text-zinc-700" /> : <Disc size={64} className="text-zinc-700" />}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{(topResult as any).type}</span>
              <h3 className="text-5xl font-black text-white uppercase tracking-tighter">{(topResult as any).name || (topResult as any).title}</h3>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                {topResult.type === 'artist' && `${artists.find(a => a.id === topResult.id)?.groups?.length || 0} Groups`}
                {topResult.type === 'album' && `${albums.find(al => al.id === topResult.id)?.artistId}`}
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {results.artists.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Artists</h2>
            <div className="space-y-2">
              {results.artists.map(artist => (
                <button key={artist.id} onClick={() => navigate(`/artists/${artist.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl transition-colors text-left group">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                    {artist.image && <img src={artist.image} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-sm font-bold text-white group-hover:text-blue-400">{artist.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {results.albums.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Albums</h2>
            <div className="space-y-2">
              {results.albums.map(album => (
                <button key={album.id} onClick={() => navigate(`/albums/${album.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl transition-colors text-left group">
                  <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden">
                    {album.covers?.[0] && <img src={album.covers[0]} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-sm font-bold text-white group-hover:text-blue-400">{album.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {results.tracks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Tracks</h2>
            <div className="space-y-2">
              {results.tracks.map(track => (
                <button key={track.id} onClick={() => navigate(`/tracks?search=${track.title}`)} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl transition-colors text-left group">
                  <div className="w-10 h-10 rounded bg-zinc-900 flex items-center justify-center">
                    <Music size={16} className="text-zinc-700" />
                  </div>
                  <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { cn } from '@/lib/utils';
export default SearchResults;
