"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Badge } from '@/components/ui/badge';
import { Play, ListMusic, Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateTrackModal } from '@/components/modals/CreateTrackModal';
import { CreateReleaseModal } from '@/components/modals/CreateReleaseModal';
import { EditAlbumModal } from '@/components/modals/EditAlbumModal';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { Card } from '@/components/ui/card';
import { Rating } from '@/components/ui/Rating';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { cn } from '@/lib/utils';

const AlbumDetail = () => {
  const { id } = useParams();
  const { albums, artists, releases, tracks, setCurrentTrack } = useMusicStore();
  
  const album = albums.find(a => a.id === id);
  const artist = artists.find(a => a.id === album?.artistId);
  const albumReleases = releases.filter(r => r.albumId === id);
  
  // Release switching logic
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  
  useEffect(() => {
    if (albumReleases.length > 0 && !selectedReleaseId) {
      setSelectedReleaseId(albumReleases[0].id);
    }
  }, [albumReleases, selectedReleaseId]);

  const currentRelease = albumReleases.find(r => r.id === selectedReleaseId);
  
  // Filter tracks based on selected release
  const albumTracks = tracks.filter(t => {
    if (currentRelease) {
      return currentRelease.trackIds.includes(t.id);
    }
    return t.albumIds.includes(id || '');
  });

  if (!album) return <div className="p-8">Album not found.</div>;

  const displayCover = currentRelease?.coverImage || album.covers[0] || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-8 items-end">
        <img 
          src={displayCover} 
          className="w-64 h-64 rounded-xl shadow-2xl border border-zinc-800 object-cover" 
          alt={album.title} 
        />
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 uppercase text-[9px] font-black">
              {album.type}
            </Badge>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
              {album.title}
            </h1>
            <p className="text-xl font-bold text-blue-500">{artist?.name}</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className="bg-white text-black hover:bg-zinc-200 font-bold px-8 rounded-full gap-2" 
              onClick={() => albumTracks.length > 0 && setCurrentTrack(albumTracks[0].id)}
            >
              <Play fill="currentColor" size={18} /> Play
            </Button>
            <EditAlbumModal album={album}>
              <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 rounded-full font-bold">
                Edit Project
              </Button>
            </EditAlbumModal>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ListMusic size={14} /> Tracklist
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">{albumTracks.length} Tracks</span>
              <CreateTrackModal albumId={album.id} artistId={album.artistId} />
            </div>
          </div>

          {albumTracks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-zinc-900 rounded-xl">
              <p className="text-zinc-600 text-sm">No tracks found for this release.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="hover:bg-transparent border-zinc-900">
                <TableRow className="border-zinc-900 hover:bg-transparent">
                  <TableHead className="w-10 text-zinc-600 text-[10px] font-black uppercase">#</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {albumTracks.map((track, index) => (
                  <TableRow key={track.id} className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group">
                    <TableCell className="text-zinc-500 font-mono text-xs">{(index + 1).toString().padStart(2, '0')}</TableCell>
                    <TableCell onClick={() => setCurrentTrack(track.id)} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{track.genres.join(', ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Rating
                        balanced={track.rating}
                        unbalanced={track.initialRating}
                        comparisons={track.comparisons}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrackContextMenu track={track} />
                        <EditTrackModal track={track} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                  <Layers size={12} /> Releases
                </h3>
                <CreateReleaseModal albumId={album.id} />
              </div>
              <div className="space-y-2">
                {albumReleases.map(release => (
                  <button 
                    key={release.id} 
                    onClick={() => setSelectedReleaseId(release.id)}
                    className={cn(
                      "w-full text-left text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center justify-between group",
                      selectedReleaseId === release.id 
                        ? "bg-blue-600 text-white" 
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    )}
                  >
                    <span className="truncate">{release.title}</span>
                    {selectedReleaseId === release.id && <Check size={12} />}
                  </button>
                ))}
                {albumReleases.length === 0 && (
                  <p className="text-[10px] text-zinc-600 italic">No releases indexed.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;