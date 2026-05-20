"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Info, ListMusic, ChevronUp, ChevronDown, Trash2, Merge, Music } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { cn, trackHasAlbum } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Rating } from '../ui/Rating'; // Import Rating component

export const BottomPlayer = () => {
  const {
    currentTrackId, tracks, artists, albums, isPlaying, togglePlay,
    volume, setVolume, nextTrack, previousTrack, logPlayback,
    userQueue, activeQueue, removeFromUserQueue, clearUserQueue,
    mergeActiveToUserQueue, clearActiveQueue, shuffleActiveQueue,
    isShuffled, toggleShuffle, activeProfile, setProgress: setStoreProgress, setDuration: setStoreDuration
  } = useMusicStore();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const artist = artists.find(a => a.id === currentTrack?.artistId);
  const album = albums.find(al => currentTrack && trackHasAlbum(currentTrack, al.id));
  const defaultImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      setStoreProgress(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setStoreDuration(audio.duration);
    };
    const handleEnded = () => {
      if (currentTrackId && audio.duration) {
        logPlayback(currentTrackId, Math.floor(audio.duration));
      }
      nextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      // Clean up audio source when component unmounts or track changes
      if (audio) {
        audio.removeAttribute('src');
      }
    };
  }, [currentTrackId]); // Re-run effect if currentTrackId changes

  useEffect(() => {
    if (audioRef.current && currentTrack?.localFilePath) {
      const audio = audioRef.current;
      if (isPlaying) {
        audio.src = currentTrack.localFilePath; // Set src when playing
        audio.currentTime = progress; // Retain current progress
        audio.play().catch(e => console.error("Audio play failed:", e));
      } else {
        // On pause, reset to start as requested
        audio.pause();
        audio.currentTime = 0; 
        setProgress(0); 
        setStoreProgress(0); 
      }
    } else if (audioRef.current && !currentTrack?.localFilePath && isPlaying) {
      // If no local file but somehow playing state is true, stop it
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      setStoreProgress(0);
      setStoreDuration(0);
    }
  }, [isPlaying, currentTrack?.localFilePath]); // Depend on isPlaying and currentTrack.localFilePath

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
    if (currentTrackId && audioRef.current) {
      logPlayback(currentTrackId, Math.floor(audioRef.current.currentTime), undefined, true);
    }
    nextTrack();
  };

  const handlePrevious = () => {
    if (currentTrackId && audioRef.current) {
      logPlayback(currentTrackId, Math.floor(audioRef.current.currentTime), undefined, true);
    }
    previousTrack();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between z-50">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 shadow-lg bg-zinc-900 flex items-center justify-center">
          {currentTrack ? (
            <img src={album?.covers[0] || defaultImage} className="w-full h-full object-cover" alt="" />
          ) : (
            <Music size={24} className="text-zinc-700" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">
            {currentTrack?.title || "No Track Selected"}
          </h4>
          <p className="text-xs font-bold text-zinc-500 truncate uppercase tracking-widest">
            {artist?.name || "Select music to play"}
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
          <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{formatTime(progress)}</span>
          <Slider 
            value={[progress]} 
            max={duration || 100} 
            step={1} 
            disabled={!currentTrackId}
            onValueChange={([val]) => {
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="flex-1"
          />
          <span className="text-[10px] font-mono text-zinc-500 w-10">{formatTime(duration)}</span>
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
          />
        </div>
      </div>
    </div>
  );
};