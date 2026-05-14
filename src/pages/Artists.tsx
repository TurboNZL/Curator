import { useEffect } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateArtistModal } from '@/components/modals/CreateArtistModal';
import { EditArtistModal } from '@/components/modals/EditArtistModal';

const Artists = () => {
  const { artists, fetchData } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Artists</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your catalog hierarchy starting from the root.</p>
        </div>
        <CreateArtistModal />
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input 
            className="w-full bg-zinc-900/50 border-none rounded-lg py-2 pl-10 text-sm focus:ring-1 focus:ring-blue-500 text-white" 
            placeholder="Filter artists by name, era, or genre..."
          />
        </div>
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <Filter size={18} />
        </Button>
      </div>

      {artists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <Users size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No artists in catalog</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Start by adding your first artist entity.</p>
          <CreateArtistModal />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {artists.map((artist) => (
            <div key={artist.id} className="relative group">
              <Link to={`/artists/${artist.id}`}>
                <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                  <div className="aspect-square overflow-hidden relative">
                    <img 
                      src={artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} 
                      alt={artist.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                      {artist.name}
                    </h3>
                  </div>
                </Card>
              </Link>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <EditArtistModal artist={artist} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Artists;