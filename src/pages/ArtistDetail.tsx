"use client";

import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Music2, Calendar, Play, Star, TrendingUp, Link as LinkIcon, User, Disc, Music, Layers, Edit2, Trash2, Plus, History, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditArtistModal } from '@/components/modals/EditArtistModal';
import { Rating } from '@/components/ui/Rating';
import { RelationalBioModal } from '@/components/modals/RelationalBioModal';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { artists, albums, tracks, setCurrentTrack, groups, activeProfile } = useMusicStore();
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  const artist = artists.find(a => a.id === id);
  const defaultImage = activeProfile.settings?.defaultArtistImage || '/placeholder.svg';
  const artistAlbums = albums.filter(al => al.artistId === id);
  const artistTracks = tracks.filter(t => t.artistId === id).sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const artistGroups = useMemo(() => {
    return groups.filter(g => 
      g.members?.some(m => m.entityId === id && m.entityType === 'artist' && m.isVisible !== false) ||
      g.members?.some(m => m.entityType === 'album' && artistAlbums.some(al => al.id === m.entityId) && m.isVisible !== false)
    );
  }, [groups, id, artistAlbums]);

  const eraGroups = useMemo(() => {
    return artistGroups.filter(g => g.isEra).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [artistGroups]);

  if (!artist) return <div className="p-8">Artist not found.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative h-80 -mt-8 -mx-8 overflow-hidden">
        <img src={artist.image || defaultImage} className="w-full h-full object-cover blur-sm opacity-30 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 flex items-end gap-8">
          <img src={artist.image || defaultImage} className="w-48 h-48 object-cover rounded-2xl shadow-2xl border-4 border-zinc-900" />
          <div className="flex-1 pb-4">
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">{artist.name}</h1>
            <div className="flex items-center gap-6 mt-4 text-zinc-400 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Music2 size={16} className="text-zinc-600"/> {artistAlbums.length} Albums</span>
              <span className="flex items-center gap-1.5"><LinkIcon size={16} className="text-zinc-600"/> {artistGroups.length}</span>
              <div className="flex gap-2 ml-4"><EditArtistModal artist={artist} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-4">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="text-[10px] font-black uppercase tracking-widest h-8">Grid View</Button>
          <Button variant={viewMode === 'timeline' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('timeline')} className="text-[10px] font-black uppercase tracking-widest h-8 gap-2"><History size={14} /> Timeline Mode</Button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <div className="space-y-12">
          {eraGroups.map((era) => (
            <section key={era.id} className="relative pl-12">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
              <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-zinc-950" />
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{era.name}</h2>
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{era.startDate} — {era.endDate || 'Present'}</p>
                  <p className="text-zinc-400 mt-2 max-w-2xl">{era.description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {artistAlbums.filter(al => era.members?.some(m => m.entityId === al.id)).map(album => (
                    <Card key={album.id} className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all cursor-pointer group" onClick={() => navigate(`/albums/${album.id}`)}>
                      <div className="aspect-square rounded-lg overflow-hidden mb-3"><img src={album.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                      <h3 className="text-sm font-bold text-white truncate">{album.title}</h3>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-6"><h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Discography</h2><Plus size={18} className="text-zinc-500 cursor-pointer" /></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {artistAlbums.map(album => (
                  <Card key={album.id} className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all cursor-pointer group" onClick={() => navigate(`/albums/${album.id}`)}>
                    <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                      <img src={album.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button size="icon" className="rounded-full bg-blue-600 w-10 h-10"><Play fill="currentColor" size={18}/></Button></div>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{album.title}</h3>
                  </Card>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4"><TrendingUp size={14} className="text-blue-500" /><h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Top Rated Tracks</h2></div>
              <div className="space-y-2">
                {artistTracks.slice(0, 5).map((track, i) => (
                  <div key={track.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors cursor-pointer group" onClick={() => setCurrentTrack(track.id)}>
                    <div className="flex items-center gap-3 min-w-0"><span className="text-[10px] font-mono text-zinc-600">{i + 1}</span><span className="text-xs font-bold text-white truncate group-hover:text-blue-400">{track.title}</span></div>
                    <Rating trackId={track.id} balanced={track.rating} unbalanced={track.initialRating} comparisons={track.comparisons} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistDetail;