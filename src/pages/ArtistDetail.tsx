import { useParams } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music2, Calendar, Share2, Play, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateEraModal } from '@/components/modals/CreateEraModal';
import { CreateAlbumModal } from '@/components/modals/CreateAlbumModal';
import { EditArtistModal } from '@/components/modals/EditArtistModal';

const ArtistDetail = () => {
  const { id } = useParams();
  const { artists, albums, tracks, setCurrentTrack } = useMusicStore();
  const artist = artists.find(a => a.id === id);
  const artistAlbums = albums.filter(al => al.artistId === id);
  const artistTracks = tracks.filter(t => t.artistId === id).sort((a, b) => b.rating - a.rating);

  if (!artist) return <div className="p-8">Artist not found.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative h-80 -mt-8 -mx-8 overflow-hidden">
        <img src={artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} className="w-full h-full object-cover blur-sm opacity-30 scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-12 flex items-end gap-8">
          <img src={artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} className="w-48 h-48 object-cover rounded-2xl shadow-2xl border-4 border-zinc-900" alt={artist.name} />
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 font-black uppercase text-[10px]">Verified Entity</Badge>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">{artist.name}</h1>
            <div className="flex items-center gap-6 mt-4 text-zinc-400 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Music2 size={16} className="text-zinc-600"/> {artistAlbums.length} Albums</span>
              <span className="flex items-center gap-1.5"><Calendar size={16} className="text-zinc-600"/> {artist.eras.length} Eras</span>
              <div className="flex gap-2 ml-4">
                <EditArtistModal artist={artist} />
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full border-zinc-800 bg-zinc-900/50"><Share2 size={14}/></Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Era Timeline</h2>
              <CreateEraModal artistId={artist.id} />
            </div>
            <div className="space-y-4">
              {artist.eras.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No eras defined for this artist.</p>
              ) : (
                artist.eras.map((era) => (
                  <div key={era.id} className="relative pl-8 group">
                    <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-zinc-900 group-last:bottom-auto group-last:h-4" />
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-zinc-950" />
                    <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <h4 className="text-sm font-bold text-white">{era.name}</h4>
                      <p className="text-xs text-zinc-500 mt-1">{era.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Discography</h2>
              <CreateAlbumModal />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {artistAlbums.map(album => (
                <Card key={album.id} className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all cursor-pointer group">
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                    <img src={album.covers[0] || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={album.title} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" className="rounded-full bg-blue-600 hover:bg-blue-500 text-white w-10 h-10">
                        <Play fill="currentColor" size={18}/>
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{album.title}</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter">{album.type}</p>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Top Rated Tracks</h2>
            </div>
            <div className="space-y-2">
              {artistTracks.slice(0, 5).map((track, i) => (
                <div key={track.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors cursor-pointer group" onClick={() => setCurrentTrack(track.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-600">{i + 1}</span>
                    <span className="text-xs font-bold text-white truncate group-hover:text-blue-400">{track.title}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-bold text-zinc-400">{track.rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Biography</h2>
            <p className="text-sm text-zinc-400 leading-relaxed italic">{artist.bio ? `"${artist.bio}"` : "No biography provided."}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ArtistDetail;