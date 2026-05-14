import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { FileAudio, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Releases = () => {
  const { releases, albums, artists } = useMusicStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Releases</h1>
          <p className="text-zinc-500 text-sm mt-1">Specific versions and pressings of your indexed projects.</p>
        </div>
      </div>

      {releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <FileAudio size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No releases indexed</h3>
          <p className="text-zinc-600 text-sm mt-1">Add a release from an album's detail page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {releases.map((release) => {
            const album = albums.find(a => a.id === release.albumId);
            const artist = artists.find(a => a.id === album?.artistId);
            return (
              <Card key={release.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden group">
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800">
                    <img 
                      src={release.coverImage || album?.covers[0] || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'} 
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-white text-sm truncate">{release.title}</h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{album?.title}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">{artist?.name}</p>
                  </div>
                  <Link to={`/albums/${album?.id}`} className="text-zinc-600 hover:text-white transition-colors">
                    <ExternalLink size={16} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Releases;