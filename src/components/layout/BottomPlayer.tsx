"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Info, ListMusic, ChevronUp, ChevronDown, Trash2, Merge, Music, MoreVertical, Edit2, List, Plus, Minus, Link as LinkIcon } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils'; // Import getAlbumDisplayCover
import { ScrollArea } from '../ui/scroll-area';
import { Rating } from '../ui/Rating'; // DO NOT CHANGE THE STYLE OF THE RATING CARD
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';

const PARTIAL_PLAY_THRESHOLD_SECONDS = 30; // Define the threshold for partial plays

export const BottomPlayer = () => {
  const {
    currentTrackId, tracks, artists, albums, releases, isPlaying, togglePlay, // Added releases
    volume, setVolume, nextTrack, previousTrack, logPlayback,
    userQueue, activeQueue, removeFromUserQueue, clearUserQueue,
    mergeActiveToUserQueue, clearActiveQueue, shuffleActiveQueue,
    isShuffled, toggleShuffle, activeProfile, setProgress: setStoreProgress, setDuration: setStoreDuration,
    deleteTrack, addToUserQueue: addToUserQueueStore, incrementMemories, decrementMemories
  } = useMusicStore();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<any>(null);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<any>(null);


  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionStartAudioTimeRef = useRef<number | null>(null);
  const previousTrackIdForLoggingRef = useRef<string | null>(null); // To store trackId *before* it changes for logging
  const isPlayingRef = useRef(isPlaying); // Keep track of isPlaying state for cleanup/logging

  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const artist = artists.find(a => a.id === currentTrack?.artistId);
  const album = albums.find(al => currentTrack && trackHasAlbum(currentTrack, al.id));
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  // Update refs when relevant props change
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    previousTrackIdForLoggingRef.current = currentTrackId; // This will hold the ID of the track that *was* playing
  }, [isPlaying, currentTrackId]);


  const commitPlaybackLog = useCallback((trackIdToLog: string, isSkipped: boolean) => {
    const audio = audioRef.current;
    if (!audio || !trackIdToLog || playbackSessionStartAudioTimeRef.current === null) return;

    // Calculate actual duration played since the session started
    const durationPlayed = audio.currentTime - playbackSessionStartAudioTimeRef.current;

    if (durationPlayed > 0) {
      logPlayback(trackIdToLog, durationPlayed, currentTrackId ? { type: 'track', id: currentTrackId } : undefined, isSkipped);
    }
    playbackSessionStartAudioTimeRef.current = null; // Reset session
  }, [logPlayback, currentTrackId]);

  // Main effect for audio events and playback control
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      setStoreProgress(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setStoreDuration(audio.duration);
      // If a track loads and we should be playing, start the playback session for accurate logging
      if (isPlayingRef.current && currentTrackId) {
        playbackSessionStartAudioTimeRef.current = 0; // New track, starts from 0 audio time
      }
    };
    const handleEnded = () => {
      if (currentTrackId) {
        // Log the completed playback duration (from session start to end of track)
        commitPlaybackLog(currentTrackId, false);
      }
      nextTrack();
    };
    const handlePauseEvent = () => {
      // This listener handles pauses that are not explicitly triggered by togglePlay
      // For now, togglePlay handles the logging on pause. This is a safeguard if other things pause it.
      // We rely on the togglePlay useEffect to manage session state changes.
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePauseEvent); // Just in case, might not be strictly necessary with other logic

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePauseEvent);
    };
  }, [volume, currentTrackId, nextTrack, setStoreDuration, setStoreProgress, commitPlaybackLog]);


  // Effect for controlling play/pause and source changes
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const previousTrackWasPlaying = previousTrackIdForLoggingRef.current === audio.dataset.currentTrackId && isPlayingRef.current;
    const trackIdChanged = currentTrackId !== audio.dataset.currentTrackId;

    if (trackIdChanged) {
      // If track changed AND previous track was playing, commit log for the previous track (as skipped/interrupted)
      if (audio.dataset.currentTrackId && previousTrackWasPlaying && playbackSessionStartAudioTimeRef.current !== null) {
        commitPlaybackLog(audio.dataset.currentTrackId, true);
      }

      // Load new track
      if (currentTrack?.localFilePath) {
        audio.src = currentTrack.localFilePath;
        audio.currentTime = 0;
        setProgress(0);
        setStoreProgress(0);
        audio.dataset.currentTrackId = currentTrackId || '';
      } else {
        audio.removeAttribute('src');
        setProgress(0);
        setStoreProgress(0);
        setDuration(0);
        setStoreDuration(0);
        audio.dataset.currentTrackId = '';
      }
      // New session starts from 0 for audio time (but real time starts when play is called)
      playbackSessionStartAudioTimeRef.current = 0; 
    }

    // Handle play/pause state
    if (isPlaying && currentTrackId) {
      if (audio.paused) { // Only play if currently paused
        audio.play().catch(e => console.error("Error playing audio:", e));
        playbackSessionStartAudioTimeRef.current = audio.currentTime; // Start/resume session
      }
    } else { // Paused
      if (!audio.paused && playbackSessionStartAudioTimeRef.current !== null) { // Only log if it was actually playing
        commitPlaybackLog(currentTrackId!, false); // Use currentTrackId! as we know it's not null here
      }
      audio.pause();
    }
  }, [currentTrackId, currentTrack, isPlaying, setStoreDuration, setStoreProgress, commitPlaybackLog]);


  // Cleanup effect when component unmounts or currentTrackId becomes null
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio && previousTrackIdForLoggingRef.current && isPlayingRef.current && playbackSessionStartAudioTimeRef.current !== null) {
        commitPlaybackLog(previousTrackIdForLoggingRef.current, false); // Log current session on unmount
      }
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      playbackSessionStartAudioTimeRef.current = null;
    };
  }, [commitPlaybackLog]);

  // Effect to sync volume slider with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentTrackId) {
      commitPlaybackLog(currentTrackId, true); // Log as skipped
    }
    nextTrack();
  };

  const handlePrevious = () => {
    if (currentTrackId) {
      commitPlaybackLog(currentTrackId, true); // Log as skipped
    }
    previousTrack();
  };

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between z-50">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 shadow-lg bg-zinc-900 flex items-center justify-center">
          {currentTrack ? (
            <img src={getAlbumDisplayCover(album, releases, defaultAlbumImage)} className="w-full h-full object-cover" alt="" /> 
          ) : (
            <Music size={24} className="text-zinc-700" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">
            {currentTrack?.title || "No Track Selected"}
          </h4>
          <p className="text-xs font-bold text-zinc-400 truncate uppercase tracking-widest">
            {artist?.name || "Select music to play"}
          </p>
          {currentTrack && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-black px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 uppercase tracking-tighter">
                {currentTrack?.bitrate || '320kbps'}
              </span>
              {/* DO NOT CHANGE THE STYLE OF THE RATING CARD */}
              <Rating track={currentTrack} showEditor={false} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-300 disabled:opacity-30" 
            onClick={handlePrevious}
            disabled={!currentTrackId}
          >
            <SkipBack size={20} fill="currentColor" />
          </Button>
          <Button
            onClick={togglePlay}
            disabled={!currentTrackId}
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center disabled:opacity-30"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-300 disabled:opacity-30" 
            onClick={handleNext}
            disabled={!currentTrackId && userQueue.length === 0 && activeQueue.length === 0}
          >
            <SkipForward size={20} fill="currentColor" />
          </Button>
        </div>
        <div className="flex items-center gap-3 w-full max-w-md">
          <span className="text-xs font-bold text-zinc-400 uppercase w-10 text-right">{formatTime(progress)}</span> {/* Updated */}
          <Slider 
            value={[progress]} 
            max={duration || 100} 
            step={1} 
            disabled={!currentTrackId}
            onValueChange={([val]) => {
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="flex-1"
            classNames={{ // Added classNames prop
              range: "bg-zinc-600", // Filled part color
              track: "border border-zinc-500" // Outline for the entire track
            }}
          />
          <span className="text-xs font-bold text-zinc-400 uppercase w-10">{formatTime(duration)}</span> {/* Updated */}
        </div>
      </div>

      {/* Volume & Extra */}
      <div className="flex items-center justify-end gap-4 w-1/3">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-8 w-8", showQueue ? "text-blue-500" : "text-zinc-500")}
            onClick={() => setShowQueue(!showQueue)}
          >
            <ListMusic size={18} />
          </Button>
          
          {showQueue && (
            <div className="absolute bottom-16 right-0 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/50">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Playback Queue</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={clearUserQueue} title="Clear User Queue">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-4">
                  {activeQueue.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[8px] font-black uppercase text-zinc-600 tracking-tighter">Active Session</span>
                        <div className="flex items-center gap-1">
                          <button onClick={shuffleActiveQueue} className="text-[8px] font-black uppercase text-blue-500 hover:text-blue-400">Shuffle</button>
                          <span className="text-zinc-800">|</span>
                          <button onClick={mergeActiveToUserQueue} className="text-[8px] font-black uppercase text-emerald-500 hover:text-emerald-400">Merge</button>
                          <span className="text-zinc-800">|</span>
                          <button onClick={clearActiveQueue} className="text-[8px] font-black uppercase text-red-500 hover:text-red-400">Clear</button>
                        </div>
                      </div>
                      {activeQueue.map((tid, i) => {
                        const t = tracks.find(track => track.id === tid);
                        return (
                          <div key={`active-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 group">
                            <span className="text-[10px] font-mono text-zinc-700 w-4">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-300 truncate">{t?.title}</p>
                              <p className="text-[8px] font-bold text-zinc-600 uppercase">{artists.find(a => a.id === t?.artistId)?.name}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="px-2 text-[8px] font-black uppercase text-zinc-600 tracking-tighter">Up Next</span>
                    {userQueue.length === 0 && activeQueue.length === 0 && (
                      <p className="text-[10px] text-zinc-700 italic text-center py-8">Queue is empty</p>
                    )}
                    {userQueue.map((tid, i) => {
                      const t = tracks.find(track => track.id === tid);
                      return (
                        <div key={`user-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 group">
                          <span className="text-[10px] font-mono text-zinc-700 w-4">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-300 truncate">{t?.title}</p>
                            <p className="text-[8px] font-bold text-zinc-600 uppercase">{artists.find(a => a.id === t?.artistId)?.name}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => removeFromUserQueue(i)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <StatsForNerdsModal track={currentTrack} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 disabled:opacity-30" disabled={!currentTrackId}>
            <Info size={18} />
          </Button>
        </StatsForNerdsModal>
        
        {currentTrack && ( // Conditionally render the dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTrackForEdit(currentTrack);
                  setIsEditTrackModalOpen(true);
                }}
                className="text-xs font-medium"
              >
                <Edit2 size={14} className="mr-2" /> Edit Track
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  addToUserQueueStore(currentTrack.id);
                  toast.success(`"${currentTrack.title}" added to queue.`);
                }}
                className="text-xs font-medium"
              >
                <List size={14} className="mr-2" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  incrementMemories(currentTrack.id);
                  toast.success(`Memory added for "${currentTrack.title}".`);
                }}
                className="text-xs font-medium"
              >
                <Plus size={14} className="mr-2" /> Add Memory
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  decrementMemories(currentTrack.id);
                  toast.success(`Memory removed for "${currentTrack.title}".`);
                }}
                disabled={currentTrack.memories === 0}
                className="text-xs font-medium"
              >
                <Minus size={14} className="mr-2" /> Remove Memory
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTrackForPlaylistAdd(currentTrack);
                  setIsCreatePlaylistAddModalOpen(true);
                }}
                className="text-xs font-medium"
              >
                <Plus size={14} className="mr-2" /> Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatsModalOpen(true);
                }}
                className="text-xs font-medium"
              >
                <Info size={14} className="mr-2" /> Stats for Nerds
              </DropdownMenuItem>
              {currentTrack.spotifyUrl && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(currentTrack.spotifyUrl); }} className="text-xs font-medium">
                    <LinkIcon size={14} className="mr-2" /> Copy Spotify Link
                  </DropdownMenuItem>
                )}
                {currentTrack.geniusUrl && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(currentTrack.geniusUrl); }} className="text-xs font-medium">
                    <LinkIcon size={14} className="mr-2" /> Copy Genius Link
                  </DropdownMenuItem>
                )}
                {currentTrack.youtubeMusicUrl && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(currentTrack.youtubeMusicUrl); }} className="text-xs font-medium">
                    <LinkIcon size={14} className="mr-2" /> Copy YouTube Music Link
                  </DropdownMenuItem>
                )}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete "${currentTrack.title}"?`)) {
                    deleteTrack(currentTrack.id);
                  }
                }}
                className="text-xs font-medium text-red-500"
              >
                <Trash2 size={14} className="mr-2" /> Delete Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <div className="flex items-center gap-3 w-32">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <Slider 
            value={[volume * 100]} 
            max={100} 
            step={1} 
            onValueChange={([val]) => setVolume(val / 100)}
            className="w-24"
            classNames={{ // Added classNames prop
              range: "bg-zinc-600", // Filled part color
              track: "border border-zinc-500" // Outline for the entire track
            }}
          />
        </div>
      </div>
      <CreatePlaylistAddModal trackToAdd={selectedTrackForPlaylistAdd} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
    </div>
  );
};