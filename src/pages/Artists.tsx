import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateArtistModal } from '@/components/modals/CreateArtistModal';

const Artists = () => {
  const { artists, fetchData } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <AppShell>
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
            <CreateArtistModal>
              <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 font-bold">
                Add Artist
              </Button>
            </CreateArtistModal>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {artists.map((artist) => (
              <Link key={artist.id} to={`/artists/${artist.id}`}>
                <Card className="group bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                  <div className="aspect-square overflow-hidden relative">
                    <img 
                      src={artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} 
                      alt={artist.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  </div>
                  <div className="p-4 relative">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                        {artist.name}
                      </h3>
                      <MoreHorizontal size={14} className="text-zinc-600" />
                    </div>
                    <div className="flex gap-1 mt-2">
                      {artist.eras.length > 0 ? (
                        artist.eras.map(era => (
                          <span key={era.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase tracking-tighter">
                            {era.name}
                          </span>
                        )).slice(0, 2)
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-700 uppercase tracking-tighter">
                          No Eras Defined
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            
            <CreateArtistModal>
              <button className="aspect-square border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-zinc-600 hover:bg-zinc-900/20 transition-all group">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
                  <Plus size={24} />
                </div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Artist</span>
              </button>
            </CreateArtistModal>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Artists;