"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Info, ListMusic, ChevronUp, ChevronDown, Trash2, Merge, Music, MoreVertical, Plus, Minus, Edit2, List, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerSlider } from '@/components/ui/PlayerSlider'; 
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Rating } from '../ui/Rating'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { toast } from 'sonner';
import { TrackDropdownMenuItems } from '../ui/TrackDropdownMenuItems'; 
import { Credit } from '@/../server/types/music'; // Corrected import path

const PARTIAL_PLAY_THRESHOLD_SECONDS = 30; 

export const BottomPlayer = () => {
  const {
    currentTrackId, tracks, artists, albums, releases, isPlaying, togglePlay,
    volume, setVolume, nextTrack, previousTrack, logPlayback,
    userQueue, activeQueue, removeFromUserQueue, clearUserQueue,
    mergeActiveToUserQueue, clearActiveQueue, shuffleActiveQueue,
    isShuffled, toggleShuffle, activeProfile, setProgress: setStoreProgress, setDuration: setStoreDuration,
  } = useMusicStore(); 

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionStartAudioTimeRef = useRef<number | null>(null);
  const previousTrackIdForLoggingRef = useRef<string | null>(null); 
  const isPlayingRef = useRef(isPlaying); 

  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const artist = artists.find(a => a.id === currentTrack?.artistId);
  const album = albums.find(al => currentTrack && trackHasAlbum(currentTrack, al.id));
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  const displayArtists = useMemo(() => {
    if (!currentTrack || !currentTrack.artistCredits) {
      return artist?.name || "Unknown Artist";
    }
    const leadArtists = currentTrack.artistCredits
      .filter(credit => credit.role.includes('Lead artist')) // Changed to .includes()
      .map(credit => artists.find(a => a.id === credit.artistId)?.name)
      .filter(Boolean);

    if (leadArtists.length > 0) {
      const allLeadArtists = leadArtists.join(', ');
      return allLeadArtists.length > 30 ? `${allLeadArtists.substring(0, 27)}...` : allLeadArtists;
    }
    return artist?.name || "Unknown Artist";
  }, [currentTrack, artists, artist]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    previousTrackIdForLoggingRef.current = currentTrackId; 
  }, [isPlaying, currentTrackId]);


  const commitPlaybackLog = useCallback((trackIdToLog: string, isSkipped: boolean) => {
    const audio = audioRef.current;
    if (!audio || !trackIdToLog || playbackSessionStartAudioTimeRef.current === null) return;

    const durationPlayed = audio.currentTime - playbackSessionStartAudioTimeRef.current;

    if (durationPlayed > 0) {
      logPlayback(trackIdToLog, durationPlayed, currentTrackId ? { type: 'track', id: currentTrackId } : undefined, isSkipped);
    }
    playbackSessionStartAudioTimeRef.current = null; 
  }, [logPlayback, currentTrackId]);

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
      if (isPlayingRef.current && currentTrackId) {
        playbackSessionStartAudioTimeRef.current = 0; 
      }
    };
    const handleEnded = () => {
      if (currentTrackId) {
        commitPlaybackLog(currentTrackId, false);
      }
      nextTrack();
    };
    const handlePauseEvent = () => {
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePauseEvent);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePauseEvent);
    };
  }, [volume, currentTrackId, nextTrack, setStoreDuration, setStoreProgress, commitPlaybackLog]);


  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const previousTrackWasPlaying = previousTrackIdForLoggingRef.current === audio.dataset.currentTrackId && isPlayingRef.current;
    const trackIdChanged = currentTrackId !== audio.dataset.currentTrackId;

    if (trackIdChanged) {
      if (audio.dataset.currentTrackId && previousTrackWasPlaying && playbackSessionStartAudioTimeRef.current !== null) {
        commitPlaybackLog(audio.dataset.currentTrackId, true);
      }

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
      playbackSessionStartAudioTimeRef.current = 0;
    }

    if (isPlaying && currentTrackId) {
      if (audio.paused) { 
        audio.play().catch(e => console.error("Error playing audio:", e));
        playbackSessionStartAudioTimeRef.current = audio.currentTime; 
      }
    } else { 
      if (!audio.paused && playbackSessionStartAudioTimeRef.current !== null) { 
        commitPlaybackLog(currentTrackId!, false); 
      }
      audio.pause();
    }
  }, [currentTrackId, currentTrack, isPlaying, setStoreDuration, setStoreProgress, commitPlaybackLog]);


  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio && previousTrackIdForLoggingRef.current && isPlayingRef.current && playbackSessionStartAudioTimeRef.current !== null) {
        commitPlaybackLog(previousTrackIdForLoggingRef.current, false); 
      }
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      playbackSessionStartAudioTimeRef.current = null;
    };
  }, [commitPlaybackLog]);

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
      commitPlaybackLog(currentTrackId, true); 
    }
    nextTrack();
  };

  const handlePrevious = () => {
    if (currentTrackId) {
      commitPlaybackLog(currentTrackId, true); 
    }
    previousTrack();
  };


  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between z-50">
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
          <p className="text-xs font-bold text-zinc-500 truncate uppercase tracking-widest">
            {displayArtists}
          </p>
          {currentTrack && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-black px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 uppercase tracking-tighter">
                {currentTrack?.bitrate || '320kbps'}
              </span>
              <Rating track={currentTrack} showEditor={false} size="sm" />
            </div>
          )}
        </div>
      </div>

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
          <span className="text-xs font-mono text-zinc-500 w-10 text-right">{formatTime(progress)}</span>
          <PlayerSlider
            value={[progress]}
            max={duration || 100}
            step={1}
            disabled={!currentTrackId}
            onValueChange={([val]) => {
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="flex-1"
          />
          <span className="text-xs font-mono text-zinc-500 w-10">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 w-1/3">
        {currentTrack && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
              <TrackDropdownMenuItems
                track={currentTrack}
                setSelectedTrackForPlaylistAdd={() => setIsCreatePlaylistAddModalOpen(true)}
                setIsCreatePlaylistAddModalOpen={setIsCreatePlaylistAddModalOpen}
                setSelectedTrackForEdit={() => setIsEditTrackModalOpen(true)}
                setIsEditTrackModalOpen={setIsEditTrackModalOpen}
                setSelectedTrackForStats={() => setIsStatsModalOpen(true)}
                setIsStatsModalOpen={setIsStatsModalOpen}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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

        <StatsForNerdsModal track={currentTrack} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />

        {currentTrack && (
          <CreatePlaylistAddModal trackToAdd={currentTrack} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
        )}
        {currentTrack && (
          <EditTrackModal
            track={currentTrack}
            open={isEditTrackModalOpen}
            onOpenChange={setIsEditTrackModalOpen}
          />
        )}

        <div className="flex items-center gap-3 w-32">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <PlayerSlider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={([val]) => setVolume(val / 100)}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};