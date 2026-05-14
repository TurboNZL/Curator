import { useEffect } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateAlbumModal } from '@/components/modals/CreateAlbumModal';
import { EditAlbumModal } from '@/components/modals/EditAlbumModal';

const Albums = () => {
  const { albums, artists, fetchData } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Albums</h1>
          <p className="text-zinc-500 text-sm mt-1">Browse your indexed full-length projects and EPs.</p>
        </div>
        <CreateAlbumModal />
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <Disc size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">Your library is empty</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Start by adding an artist or indexing an album.</p>
          <CreateAlbumModal />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {albums.map((album) => {
            const artist = artists.find(a => a.id === album.artistId);
            return (
              <div key={album.id} className="relative group">
                <Link to={`/albums/${album.id}`}>
                  <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                    <div className="aspect-square overflow-hidden relative">
                      <img 
                        src={album.covers[0] || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={album.title}
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-white text-sm truncate">{album.title}</h3>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{artist?.name || 'Unknown Artist'}</p>
                    </div>
                  </Card>
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EditAlbumModal album={album} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Albums;