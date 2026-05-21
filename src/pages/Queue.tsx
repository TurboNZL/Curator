"use client";

import React, { useState, useEffect } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { ListMusic, Trash2, Shuffle, Play, GripVertical, Music, Loader2, Edit2, Plus, Minus, Info, List, MoreVertical, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { Track } from '@/types/music';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { toast } from 'sonner';


const Queue = () => {
  const {
    userQueue = [],
    activeQueue = [],
    tracks = [],
    artists = [],
    albums = [],
    releases = [], // Added releases
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
    activeProfile, // Added activeProfile
    incrementMemories,
    decrementMemories,
    deleteTrack,
    addToUserQueue: addTrackToUserQueueStore // Renamed to avoid conflict with local handler
  } = useMusicStore();

  const [draggedIndex, setDragIndex] = useState<number | null>(null);

  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<Track | null>(null);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForStats, setSelectedTrackForStats] = useState<Track | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

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

  const getTrackData = (id: string) => {
    const track = tracks.find(t => t.id === id);
    const artist = artists.find(a => a.id === track?.artistId);
    const album = albums.find(al => track?.albumIds?.some(aId => aId.albumId === al.id));
    return { track, artist, album };
  };

  const currentTrackData = currentTrackId ? getTrackData(currentTrackId) : null;

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

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

      {/* Now Playing */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Now Playing</h2>
        {currentTrackData?.track ? (
          <TrackContextMenu track={currentTrackData.track}>
            <Card className="bg-blue-600/10 border-blue-500/30 p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-blue-500/20 bg-zinc-900">
                <img src={getAlbumArt(currentTrackData.track, currentTrackData.album)} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white uppercase truncate">{currentTrackData.track.title}</h3>
                <p className="text-sm font-bold text-blue-400">{currentTrackData.artist?.name || 'Unknown Artist'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
                  <ListMusic size={20} />
                </Button>
              </div>
            </Card>
          </TrackContextMenu>
        ) : (
          <p className="text-xs text-zinc-600 italic">Nothing currently playing.</p>
        )}
      </section>

      {/* User Queue (Manual) */}
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
              const { track, artist, album } = getTrackData(id);
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
                    artist={artist}
                    album={album}
                    releases={releases} // Pass releases
                    activeProfile={activeProfile} // Pass activeProfile
                    onRemove={() => removeFromUserQueue(index)}
                    onPlay={() => {
                      removeFromUserQueue(index);
                      setCurrentTrack(id);
                    }}
                    onEditTrack={(t) => { setSelectedTrackForEdit(t); setIsEditTrackModalOpen(true); }}
                    onAddToQueue={(tId) => addTrackToUserQueueStore(tId)}
                    onIncrementMemories={(tId) => incrementMemories(tId)}
                    onDecrementMemories={(tId) => decrementMemories(tId)}
                    onAddToPlaylist={(t) => { setSelectedTrackForPlaylistAdd(t); setIsCreatePlaylistAddModalOpen(true); }}
                    onStatsForNerds={(t) => { setSelectedTrackForStats(t); setIsStatsModalOpen(true); }}
                    onCopyLink={handleCopyLink}
                    onDeleteTrack={(tId) => deleteTrack(tId)}
                  />
                </div>
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
              const { track, artist, album } = getTrackData(id);
              if (!track) return null;
              return (
                <QueueItem
                  key={`${id}-${index}`}
                  track={track}
                  artist={artist}
                  album={album}
                  releases={releases} // Pass releases
                  activeProfile={activeProfile} // Pass activeProfile
                  onRemove={() => {}} // No remove from active queue
                  onPlay={() => {
                    setCurrentTrack(id);
                  }}
                  onEditTrack={(t) => { setSelectedTrackForEdit(t); setIsEditTrackModalOpen(true); }}
                  onAddToQueue={(tId) => addTrackToUserQueueStore(tId)}
                  onIncrementMemories={(tId) => incrementMemories(tId)}
                  onDecrementMemories={(tId) => decrementMemories(tId)}
                  onAddToPlaylist={(t) => { setSelectedTrackForPlaylistAdd(t); setIsCreatePlaylistAddModalOpen(true); }}
                  onStatsForNerds={(t) => { setSelectedTrackForStats(t); setIsStatsModalOpen(true); }}
                  onCopyLink={handleCopyLink}
                  onDeleteTrack={(tId) => deleteTrack(tId)}
                />
              );
            })
          )}
        </div>
      </section>

      <CreatePlaylistAddModal trackToAdd={selectedTrackForPlaylistAdd} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
      {selectedTrackForStats && (
        <StatsForNerdsModal
          track={selectedTrackForStats}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </div>
  );
};

interface QueueItemProps {
  track: Track;
  artist: any;
  album: any;
  releases: any[];
  activeProfile: any;
  onRemove: () => void;
  onPlay: () => void;
  onEditTrack: (track: Track) => void;
  onAddToQueue: (trackId: string) => void;
  onIncrementMemories: (trackId: string) => void;
  onDecrementMemories: (trackId: string) => void;
  onAddToPlaylist: (track: Track) => void;
  onStatsForNerds: (track: Track) => void;
  onCopyLink: (url?: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

const QueueItem = ({ track, artist, album, releases, activeProfile, onRemove, onPlay, onEditTrack, onAddToQueue, onIncrementMemories, onDecrementMemories, onAddToPlaylist, onStatsForNerds, onCopyLink, onDeleteTrack }: QueueItemProps) => {
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';
  const albumArt = getAlbumDisplayCover(album, releases, defaultAlbumImage);

  return (
    <TrackContextMenu track={track}>
      <div className="group flex items-center gap-4 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-lg hover:bg-zinc-900 transition-colors">
        <div className="text-zinc-700 group-hover:text-zinc-500 cursor-grab">
          <GripVertical size={14} />
        </div>
        <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden">
          <img src={albumArt} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">{artist?.name || 'Unknown Artist'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
            <Play size={14} fill="currentColor" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onEditTrack(track); }}
                className="text-xs font-medium"
              >
                <Edit2 size={14} className="mr-2" /> Edit Track
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onAddToQueue(track.id); toast.success(`"${track.title}" added to queue.`); }}
                className="text-xs font-medium"
              >
                <List size={14} className="mr-2" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onIncrementMemories(track.id); toast.success(`Memory added for "${track.title}".`); }}
                className="text-xs font-medium"
              >
                <Plus size={14} className="mr-2" /> Add Memory
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDecrementMemories(track.id); toast.success(`Memory removed for "${track.title}".`); }}
                disabled={track.memories === 0}
                className="text-xs font-medium"
              >
                <Minus size={14} className="mr-2" /> Remove Memory
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
                className="text-xs font-medium"
              >
                <Plus size={14} className="mr-2" /> Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onStatsForNerds(track); }}
                className="text-xs font-medium"
              >
                <Info size={14} className="mr-2" /> Stats for Nerds
              </DropdownMenuItem>
              {track.spotifyUrl && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(track.spotifyUrl); }} className="text-xs font-medium">
                  <LinkIcon size={14} className="mr-2" /> Copy Spotify Link
                </DropdownMenuItem>
              )}
              {track.geniusUrl && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(track.geniusUrl); }} className="text-xs font-medium">
                  <LinkIcon size={14} className="mr-2" /> Copy Genius Link
                </DropdownMenuItem>
              )}
              {track.youtubeMusicUrl && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(track.youtubeMusicUrl); }} className="text-xs font-medium">
                  <LinkIcon size={14} className="mr-2" /> Copy YouTube Music Link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (confirm(`Are you sure you want to delete "${track.title}"?`)) {
                    onDeleteTrack(track.id);
                  }
                }}
                className="text-xs font-medium text-red-500"
              >
                <Trash2 size={14} className="mr-2" /> Delete Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TrackContextMenu>
  );
};

export default Queue;