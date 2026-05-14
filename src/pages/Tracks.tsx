import { useEffect, useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Search, ListMusic } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Tracks = () => {
  const { tracks, artists, albums, setCurrentTrack, fetchData } = useMusicStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    artists.find(a => a.id === t.artistId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Global Tracks</h1>
          <p className="text-zinc-500 text-sm mt-1">Every indexed file in your local curation database.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input 
            className="bg-zinc-900/50 border-none rounded-lg pl-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white" 
            placeholder="Search by title, artist, or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListMusic size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No tracks found</h3>
          <p className="text-zinc-600 text-sm mt-1">Try adjusting your search or add tracks to an album.</p>
        </div>
      ) : (
        <Table>
          <TableHeader className="hover:bg-transparent border-zinc-900">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Artist</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Album</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Genres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTracks.map((track) => {
              const artist = artists.find(a => a.id === track.artistId);
              const album = albums.find(al => track.albumIds.includes(al.id));
              return (
                <TableRow 
                  key={track.id} 
                  className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                  onClick={() => setCurrentTrack(track.id)}
                >
                  <TableCell>
                    <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs font-medium">{artist?.name}</TableCell>
                  <TableCell className="text-zinc-500 text-xs">{album?.title || 'Single'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-zinc-300">{track.rating.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-zinc-500 font-mono text-[10px] uppercase tracking-tighter">
                    {track.genres.join(' / ')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Tracks;