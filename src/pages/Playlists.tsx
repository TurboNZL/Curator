import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { ListMusic, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatePlaylistModal } from '@/components/modals/CreatePlaylistModal';

const Playlists = () => {
  const { playlists } = useMusicStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playlists</h1>
          <p className="text-zinc-500 text-sm mt-1">Custom collections curated from your indexed library.</p>
        </div>
        <CreatePlaylistModal />
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListMusic size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No playlists created</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Start grouping your favorite tracks into collections.</p>
          <CreatePlaylistModal>
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 font-bold">
              Create Playlist
            </Button>
          </CreatePlaylistModal>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
              <div className="aspect-square overflow-hidden relative">
                {playlist.coverImage ? (
                  <img 
                    src={playlist.coverImage} 
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <ListMusic size={48} className="text-zinc-800" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                    {playlist.name}
                  </h3>
                  <MoreHorizontal size={14} className="text-zinc-600" />
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-tighter">
                  {playlist.trackIds.length} Tracks
                </p>
              </div>
            </Card>
          ))}
          
          <CreatePlaylistModal>
            <button className="aspect-square border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-zinc-600 hover:bg-zinc-900/20 transition-all group">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Playlist</span>
            </button>
          </CreatePlaylistModal>
        </div>
      )}
    </div>
  );
};

export default Playlists;