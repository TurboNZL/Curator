"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, ListMusic, Download, MoreHorizontal, Trash2, Edit2, Disc, Music, ArrowUpDown, SortAsc, SortDesc, Star, User } from 'lucide-react';
import { Rating } from '@/components/ui/Rating';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, tracks, albums, artists, updatePlaylist, deletePlaylist, setCurrentTrack } = useMusicStore();
  
  const playlist = playlists.find(p => p.id === id);
  const [sortConfig, setSortConfig] = useState(playlist?.sortConfig || { field: 'order', direction: 'asc' });

  const playlistEntries = useMemo(() => {
    if (!playlist) return [];
    
    const entries = playlist.entries.map((entry, index) => {
      if (entry.type === 'track') {
        const track = tracks.find(t => t.id === entry.id);
        const artist = artists.find(a => a.id === track?.artistId);
        const album = albums.find(al => track?.albumIds.includes(al.id));
        return { ...entry, data: track, artist, album, order: index };
      } else {
        const album = albums.find(a => a.id === entry.id);
        const artist = artists.find(a => a.id === album?.artistId);
        const albumTracks = tracks.filter(t => t.albumIds.includes(album?.id || ''));
        const avgRating = albumTracks.length > 0 
          ? albumTracks.reduce((acc, t) => acc + (t.rating || 0), 0) / albumTracks.length 
          : 0;
        return { ...entry, data: album, artist, avgRating, order: index };
      }
    });

    if (sortConfig.field === 'order') return entries;

    return [...entries].sort((a, b) => {
      let valA: any, valB: any;
      
      if (sortConfig.field === 'name') {
        valA = (a.data as any)?.title || (a.data as any)?.name;
        valB = (b.data as any)?.title || (b.data as any)?.name;
      } else if (sortConfig.field === 'rating') {
        valA = a.type === 'track' ? (a.data as any).rating : a.avgRating;
        valB = b.type === 'track' ? (b.data as any).rating : b.avgRating;
      } else if (sortConfig.field === 'artist') {
        valA = a.artist?.name;
        valB = b.artist?.name;
      }

      const comparison = String(valA).localeCompare(String(valB));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [playlist, tracks, albums, artists, sortConfig]);

  const handleExportSpotify = () => {
    if (!playlist) return;
    const urls = playlistEntries
      .filter(e => e.type === 'track' && (e.data as any).spotifyUrl)
      .map(e => (e.data as any).spotifyUrl)
      .join('\n');
    
    navigator.clipboard.writeText(urls);
    toast.success("Spotify URLs copied to clipboard");
  };

  const handleDelete = async () => {
    if (confirm("Delete this playlist?")) {
      await deletePlaylist(id!);
      navigate('/playlists');
      toast.success("Playlist deleted");
    }
  };

  if (!playlist) return <div className="p-8">Playlist not found.</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row gap-8 items-end">
        <div className="w-64 h-64 rounded-2xl shadow-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800">
              <ListMusic size={80} />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{playlist.type} Playlist</span>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">{playlist.name}</h1>
            <p className="text-zinc-500 font-medium mt-2">{playlist.description || 'No description provided.'}</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-white text-black hover:bg-zinc-200 font-bold px-8 rounded-full gap-2">
              <Play fill="currentColor" size={18} /> Play
            </Button>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 rounded-full font-bold gap-2" onClick={handleExportSpotify}>
              <Download size={16} /> Export Spotify
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-zinc-500 hover:text-red-500" onClick={handleDelete}>
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/20 rounded-2xl border border-zinc-900 overflow-hidden">
        <Table>
          <TableHeader className="hover:bg-transparent border-zinc-900">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="w-12 text-zinc-600 text-[10px] font-black uppercase">#</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Artist</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playlistEntries.map((entry, i) => (
              <TableRow key={`${entry.type}-${entry.id}-${i}`} className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group">
                <TableCell className="text-xs text-zinc-600 font-mono">{i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                      {entry.type === 'track' ? (
                        <img src={entry.album?.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover" />
                      ) : (
                        <img src={(entry.data as any).covers[0] || '/placeholder.svg'} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400">
                        {(entry.data as any).title}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                        {entry.type}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400 text-xs font-medium">{entry.artist?.name}</TableCell>
                <TableCell>
                  {entry.type === 'track' ? (
                    <Rating trackId={entry.id} balanced={(entry.data as any).rating} unbalanced={(entry.data as any).initialRating} comparisons={(entry.data as any).comparisons} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500">AVG</span>
                      <span className="text-xs font-black text-blue-500">{entry.avgRating?.toFixed(1)}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.type === 'track' && <TrackContextMenu track={entry.data as any} />}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PlaylistDetail;