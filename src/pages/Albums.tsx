import { useEffect, useState, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Disc, Search, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateAlbumModal } from '@/components/modals/CreateAlbumModal';
import { EditAlbumModal } from '@/components/modals/EditAlbumModal';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Albums = () => {
  const { albums, artists, fetchData, activeProfile } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: 'title', direction: 'asc' as 'asc' | 'desc' });
  const defaultImage = activeProfile.settings?.defaultAlbumImage || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';

  const [isCreateAlbumModalOpen, setIsCreateAlbumModalOpen] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const filteredAlbums = useMemo(() => {
    return albums.filter(a =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      artists.find(art => art.id === a.artistId)?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [albums, search, artists]);

  const sortedAlbums = useMemo(() => {
    return [...filteredAlbums].sort((a, b) => {
      let comparison = a.title.localeCompare(b.title);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredAlbums, sortConfig]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Albums</h1>
          <p className="text-zinc-500 text-sm mt-1">Browse your indexed full-length projects and EPs.</p>
        </div>
        <CreateAlbumModal open={isCreateAlbumModalOpen} onOpenChange={setIsCreateAlbumModalOpen}>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 rounded-full">
            <Plus size={18} />
            New Album
          </Button>
        </CreateAlbumModal>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input
            className="bg-zinc-900/50 border-none rounded-lg pl-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white"
            placeholder="Search albums or artists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-xs font-bold gap-2">
              <ArrowUpDown size={14} /> Sort: {sortConfig.field}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sort By</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'title' })} className="text-xs font-bold gap-2">
              <Disc size={14} /> Title
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold gap-2">
              {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sortedAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <Disc size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No albums found</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Try adjusting your search or index a new album.</p>
          <CreateAlbumModal open={isCreateAlbumModalOpen} onOpenChange={setIsCreateAlbumModalOpen}>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 rounded-full">
              <Plus size={18} />
              New Album
            </Button>
          </CreateAlbumModal>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {sortedAlbums.map((album) => {
            const artist = artists.find(a => a.id === album.artistId);
            return (
              <div key={album.id} className="relative group">
                <Link to={`/albums/${album.id}`}>
                  <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                    <div className="aspect-square overflow-hidden relative">
                      <img
                        src={album.covers[0] || defaultImage}
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