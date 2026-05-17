"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Info, ListMusic, ChevronUp, ChevronDown, Trash2, Merge } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export const BottomPlayer = () => {
  const {
    currentTrackId, tracks, artists, albums, isPlaying, togglePlay,
    volume, setVolume, nextTrack, previousTrack, logPlayback,
    userQueue, activeQueue, removeFromUserQueue, clearUserQueue,
    mergeActiveToUserQueue, clearActiveQueue, shuffleActiveQueue,
    isShuffled, toggleShuffle, activeProfile
  } = useMusicStore();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const artist = artists.find(a => a.id === currentTrack?.artistId);
  const album = albums.find(al => currentTrack?.albumIds.includes(al.id));
  const defaultImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
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
    };
  }, [currentTrackId]);

  useEffect(() => {
    if (audioRef.current) {
      if (currentTrack?.localFilePath) {
        audioRef.current.src = currentTrack.localFilePath;
        if (isPlaying) audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackId]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying]);

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

  if (!currentTrackId) return null;

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
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 shadow-lg">
          <img src={album?.covers[0] || defaultImage} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">{currentTrack?.title}</h4>
          <p className="text-xs font-bold text-zinc-500 truncate uppercase tracking-widest">{artist?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 uppercase tracking-tighter">
              {currentTrack?.bitrate || '320kbps'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300" onClick={handlePrevious}>
            <SkipBack size={20} fill="currentColor" />
          </Button>
          <Button
            onClick={togglePlay}
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300" onClick={handleNext}>
            <SkipForward size={20} fill="currentColor" />
          </Button>
        </div>
        <div className="flex items-center gap-3 w-full max-w-md">
          <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{formatTime(progress)}</span>
          <Slider 
            value={[progress]} 
            max={duration || 100} 
            step={1} 
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

        <StatsForNerdsModal track={currentTrack} artist={artist} album={album}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
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
