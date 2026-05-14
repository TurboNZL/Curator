import { AppShell } from '@/components/layout/AppShell';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Plus, Search, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Albums = () => {
  const { albums, artists } = useMusicStore();

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Albums</h1>
            <p className="text-zinc-500 text-sm mt-1">Browse your indexed full-length projects and EPs.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2 rounded-full">
            <Plus size={18} />
            Add Album
          </Button>
        </div>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
            <Disc size={48} className="text-zinc-800 mb-4" />
            <h3 className="text-zinc-400 font-bold">Your library is empty</h3>
            <p className="text-zinc-600 text-sm mt-1">Start by adding an artist or importing files.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {albums.map((album) => {
              const artist = artists.find(a => a.id === album.artistId);
              return (
                <Link key={album.id} to={`/albums/${album.id}`}>
                  <Card className="group bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                    <div className="aspect-square overflow-hidden relative">
                      <img 
                        src={album.covers[0]} 
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
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Albums;