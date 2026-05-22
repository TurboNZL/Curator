"use client";

import React, { useState, useEffect, useCallback } from 'react'; 
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { ListMusic, Trash2, Shuffle, Play, GripVertical, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils';
import { TrackRightClickMenu } from '@/components/ui/TrackRightClickMenu';
import { Track } from '@/types/music';

const Queue = () => {
  const {
    userQueue = [],
    activeQueue = [],
    tracks = [],
    artists = [],
    albums = [],
    releases = [], 
    currentTrackId,
    setCurrentTrack,
    removeFromUserQueue,
    clearUserQueue,
    shuffleUserQueue,
    shuffleActiveQueue,
    mergeActiveToUserQueue,
    clearActiveQueue,
    reorderUserQueue,
    fetchData,
    isLoading,
    activeProfile 
  } = useMusicStore();

  const [draggedIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const onDragStart = (index: number) => {
    setDragIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    reorderUserQueue(draggedIndex, index);
    setDragIndex(index);
  };

  const onDragEnd = () => {
    setDragIndex(null);
  };

  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  const getAlbumArt = (track: Track | undefined, album: any) => {
    if (!track) return defaultAlbumImage;
    return getAlbumDisplayCover(album, releases, defaultAlbumImage);
  };

  const getTrackDisplayArtists = useCallback((track: any) => {
    if (!track || !track.artistCredits) {
      const primaryArtist = artists.find(a => a.id === track.artistId);
      return primaryArtist?.name || "Unknown Artist";
    }

    const leadArtists = track.artistCredits
      .filter((credit: any) => credit.role.includes('Lead artist')) // Changed to .includes()
      .map((credit: any) => artists.find(a => a.id === credit.artistId)?.name)
      .filter(Boolean);

    if (leadArtists.length > 0) {
      return leadArtists.join(', ');
    }
    const primaryArtist = artists.find(a => a.id === track.artistId);
    return primaryArtist?.name || "Unknown Artist";
  }, [artists]);


  const getTrackData = (id: string) => {
    const track = tracks.find(t => t.id === id);
    const artistName = track ? getTrackDisplayArtists(track) : 'Unknown Artist';
    const album = albums.find(al => track?.albumIds?.some(aId => aId.albumId === al.id));
    return { track, artistName, album };
  };

  const currentTrackData = currentTrackId ? getTrackData(currentTrackId) : null;

  if (isLoading && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playback Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your upcoming tracks and session flow.</p>
        </div>
        <div className="flex gap-3">
          <Button
            className="bg-white text-black hover:bg-zinc-200 font-bold gap-2"
            onClick={() => {
              if (userQueue.length > 0) {
                setCurrentTrack(userQueue[0]);
              } else if (activeQueue.length > 0) {
                setCurrentTrack(activeQueue[0]);
              }
            }}
            disabled={userQueue.length === 0 && activeQueue.length === 0}
          >
            <Play fill="currentColor" size={18} /> <span>Play Queue</span>
          </Button>
          <Button
            variant="outline"
            className="border-zinc-800 bg-zinc-900/50 text-[10px] font-black uppercase tracking-widest h-9 gap-2"
            onClick={() => {
              clearUserQueue();
              clearActiveQueue();
            }}
          >
            <Trash2 size={14} /> <span>Clear All</span>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Now Playing</h2>
        {currentTrackData?.track ? (
          <TrackRightClickMenu track={currentTrackData.track}>
            <Card className="bg-blue-600/10 border-blue-500/30 p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-blue-500/20 bg-zinc-900">
                <img src={getAlbumArt(currentTrackData.track, currentTrackData.album)} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white uppercase truncate">{currentTrackData.track.title}</h3>
                <p className="text-sm font-bold text-blue-400">{currentTrackData.artistName || 'Unknown Artist'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
                  <ListMusic size={20} />
                </Button>
              </div>
            </Card>
          </TrackRightClickMenu>
        ) : (
          <p className="text-xs text-zinc-600 italic">Nothing currently playing.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Next in Queue</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={shuffleUserQueue}>
              <Shuffle size={12} className="mr-1" /> <span>Shuffle</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={clearUserQueue}>
              <Trash2 size={12} className="mr-1" /> <span>Clear</span>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {userQueue.length === 0 ? (
            <p className="text-xs text-zinc-700 py-4 text-center border border-dashed border-zinc-900 rounded-xl">Manual queue is empty.</p>
          ) : (
            userQueue.map((id, index) => {
              const { track, artistName, album } = getTrackData(id);
              if (!track) return null;
              return (
                <div
                  key={`${id}-${index}`}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "transition-all",
                    draggedIndex === index && "opacity-50 scale-[0.98]"
                  )}
                >
                  <QueueItem
                    track={track}
                    artistName={artistName}
                    album={album}
                    releases={releases}
                    activeProfile={activeProfile}
                    onRemove={() => removeFromUserQueue(index)}
                    onPlay={() => {
                      removeFromUserQueue(index);
                      setCurrentTrack(id);
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Playing From Source</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={mergeActiveToUserQueue}>
              <span>Merge to Queue</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={shuffleActiveQueue}>
              <Shuffle size={12} className="mr-1" /> <span>Shuffle</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={clearActiveQueue}>
              <Trash2 size={12} className="mr-1" /> <span>Clear</span>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {activeQueue.length === 0 ? (
            <p className="text-xs text-zinc-700 py-4 text-center border border-dashed border-zinc-900 rounded-xl">No source tracks queued.</p>
          ) : (
            activeQueue.map((id, index) => {
              const { track, artistName, album } = getTrackData(id);
              if (!track) return null;
              return (
                <QueueItem
                  key={`${id}-${index}`}
                  track={track}
                  artistName={artistName}
                  album={album}
                  releases={releases}
                  activeProfile={activeProfile}
                  onRemove={() => {}}
                  onPlay={() => {
                    setCurrentTrack(id);
                  }}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const QueueItem = ({ track, artistName, album, releases, activeProfile, onRemove, onPlay }: {track: Track, artistName: string, album: any, releases: any[], activeProfile: any, onRemove: () => void, onPlay: () => void}) => {
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';
  const albumArt = getAlbumDisplayCover(album, releases, defaultAlbumImage);

  return (
    <TrackRightClickMenu track={track}>
      <div className="group flex items-center gap-4 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-lg hover:bg-zinc-900 transition-colors">
        <div className="text-zinc-700 group-hover:text-zinc-500 cursor-grab">
          <GripVertical size={14} />
        </div>
        <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden">
          <img src={albumArt} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">{artistName || 'Unknown Artist'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
            <Play size={14} fill="currentColor" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </TrackRightClickMenu>
  );
};

export default Queue;