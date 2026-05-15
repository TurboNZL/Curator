"use client";

import React from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { ListMusic, Trash2, Shuffle, Play, GripVertical, Disc, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';

const Queue = () => {
  const { 
    userQueue, 
    activeQueue, 
    tracks, 
    artists, 
    albums, 
    currentTrackId, 
    setCurrentTrack, 
    removeFromQueue, 
    clearQueue, 
    shuffleQueue,
    mergeActiveToUser
  } = useMusicStore();

  const getTrackData = (id: string) => {
    const track = tracks.find(t => t.id === id);
    const artist = artists.find(a => a.id === track?.artistId);
    const album = albums.find(al => track?.albumIds.includes(al.id));
    return { track, artist, album };
  };

  const currentTrackData = currentTrackId ? getTrackData(currentTrackId) : null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playback Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your upcoming tracks and session flow.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-zinc-800 bg-zinc-900/50 text-[10px] font-black uppercase tracking-widest h-9 gap-2"
            onClick={() => clearQueue('all')}
          >
            <Trash2 size={14} /> Clear All
          </Button>
        </div>
      </div>

      {/* Now Playing */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Now Playing</h2>
        {currentTrackData?.track ? (
          <Card className="bg-blue-600/10 border-blue-500/30 p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-blue-500/20">
              <img src={currentTrackData.album?.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white uppercase truncate">{currentTrackData.track.title}</h3>
              <p className="text-sm font-bold text-blue-400">{currentTrackData.artist?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <TrackContextMenu track={currentTrackData.track} />
            </div>
          </Card>
        ) : (
          <p className="text-xs text-zinc-600 italic">Nothing currently playing.</p>
        )}
      </section>

      {/* User Queue (Manual) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Next in Queue</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={() => shuffleQueue('user')}>
              <Shuffle size={12} className="mr-1" /> Shuffle
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={() => clearQueue('user')}>
              <Trash2 size={12} className="mr-1" /> Clear
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {userQueue.length === 0 ? (
            <p className="text-xs text-zinc-700 py-4 text-center border border-dashed border-zinc-900 rounded-xl">Manual queue is empty.</p>
          ) : (
            userQueue.map((id, index) => {
              const { track, artist, album } = getTrackData(id);
              if (!track) return null;
              return (
                <QueueItem 
                  key={`${id}-${index}`} 
                  track={track} 
                  artist={artist} 
                  album={album} 
                  onRemove={() => removeFromQueue(id, 'user')}
                  onPlay={() => {
                    removeFromQueue(id, 'user');
                    setCurrentTrack(id);
                  }}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Active Queue (Album/Playlist) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Playing From Source</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={mergeActiveToUser}>
              Merge to Queue
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={() => shuffleQueue('active')}>
              <Shuffle size={12} className="mr-1" /> Shuffle
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-zinc-500 hover:text-white" onClick={() => clearQueue('active')}>
              <Trash2 size={12} className="mr-1" /> Clear
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {activeQueue.length === 0 ? (
            <p className="text-xs text-zinc-700 py-4 text-center border border-dashed border-zinc-900 rounded-xl">No source tracks queued.</p>
          ) : (
            activeQueue.map((id, index) => {
              const { track, artist, album } = getTrackData(id);
              if (!track) return null;
              return (
                <QueueItem 
                  key={`${id}-${index}`} 
                  track={track} 
                  artist={artist} 
                  album={album} 
                  onRemove={() => removeFromQueue(id, 'active')}
                  onPlay={() => {
                    removeFromQueue(id, 'active');
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

const QueueItem = ({ track, artist, album, onRemove, onPlay }: any) => (
  <div className="group flex items-center gap-4 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-lg hover:bg-zinc-900 transition-colors">
    <div className="text-zinc-700 group-hover:text-zinc-500 cursor-grab">
      <GripVertical size={14} />
    </div>
    <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden">
      <img src={album?.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">{artist?.name}</p>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={onPlay}>
        <Play size={14} fill="currentColor" />
      </Button>
      <TrackContextMenu track={track} />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={onRemove}>
        <Trash2 size={14} />
      </Button>
    </div>
  </div>
);

export default Queue;
