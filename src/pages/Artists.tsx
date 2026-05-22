import { useEffect, useState, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter, Users, ArrowUpDown, ListMusic, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateArtistModal } from '@/components/modals/CreateArtistModal';
import { EditArtistModal } from '@/components/modals/EditArtistModal';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Artists = () => {
  const { artists, fetchData, activeProfile } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: 'name', direction: 'asc' as 'asc' | 'desc' });
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false); // State for CreateArtistModal
  const defaultImage = activeProfile.settings?.defaultArtistImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop';

  useEffect(() => {
    fetchData();
  }, []);

  const filteredArtists = useMemo(() => {
    return artists.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [artists, search]);

  const sortedArtists = useMemo(() => {
    return [...filteredArtists].sort((a, b) => {
      let comparison = a.name.localeCompare(b.name);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredArtists, sortConfig]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Artists</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your catalog hierarchy.</p>
        </div>
        <Button onClick={() => setIsCreateArtistModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
          <Plus size={16} /> New Artist
        </Button>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input
            className="bg-zinc-900/50 border-none rounded-lg pl-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white"
            placeholder="Search artists..."
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
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'name' })} className="text-xs font-bold gap-2">
              <Users size={14} /> Name
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold gap-2">
              {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sortedArtists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <Users size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No artists found</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Try adjusting your search or add a new artist.</p>
          <Button onClick={() => setIsCreateArtistModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
            <Plus size={16} /> New Artist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedArtists.map((artist) => (
            <div key={artist.id} className="relative group">
              <Link to={`/artists/${artist.id}`}>
                <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={artist.image || defaultImage}
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
      <CreateArtistModal open={isCreateArtistModalOpen} onOpenChange={setIsCreateArtistModalOpen} />
    </div>
  );
};

export default Artists;