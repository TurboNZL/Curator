import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Info, Repeat, Shuffle, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMusicStore } from '@/store/useMusicStore';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

export const BottomPlayer = () => {
  const { currentTrackId, tracks, albums, artists, isPlaying, togglePlay } = useMusicStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const currentAlbum = albums.find(a => a.id === currentTrack?.albumIds[0]);
  const currentArtist = artists.find(a => a.id === currentTrack?.artistId);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          useMusicStore.setState({ isPlaying: false });
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackId]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between">
      <audio 
        ref={audioRef} 
        src={currentTrack?.localFilePath} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => useMusicStore.setState({ isPlaying: false })}
      />

      <div className="flex items-center gap-4 w-[30%]">
        <div className="w-12 h-12 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center overflow-hidden">
          {currentAlbum?.covers[0] ? (
            <img src={currentAlbum.covers[0]} className="w-full h-full object-cover" alt="" />
          ) : (
            <Disc className="text-zinc-700" size={24} />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-white truncate">
            {currentTrack?.title || "No track playing"}
          </span>
          <span className="text-xs text-zinc-500 truncate">
            {currentArtist?.name || "Select a file to begin"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 max-w-xl w-full">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
            <Shuffle size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-300">
            <SkipBack size={20} />
          </Button>
          <Button 
            size="icon" 
            onClick={togglePlay}
            className="rounded-full w-10 h-10 bg-white text-black hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-300">
            <SkipForward size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
            <Repeat size={18} />
          </Button>
        </div>
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 w-10 text-right font-mono">
            {formatTime(audioRef.current?.currentTime || 0)}
          </span>
          <Slider 
            value={[progress]} 
            max={100} 
            step={0.1} 
            onValueChange={handleSliderChange}
            className="flex-1" 
          />
          <span className="text-[10px] text-zinc-500 w-10 font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 w-[30%] justify-end">
        <StatsForNerdsModal track={currentTrack} album={currentAlbum} artist={currentArtist}>
          <Button variant="ghost" size="sm" className="text-zinc-500 gap-2 h-8 px-2 hover:text-blue-400">
            <Info size={16} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Stats for nerds</span>
          </Button>
        </StatsForNerdsModal>
        <div className="flex items-center gap-2 w-32">
          <Volume2 size={18} className="text-zinc-500" />
          <Slider 
            defaultValue={[80]} 
            max={100} 
            step={1} 
            onValueChange={(val) => {
              if (audioRef.current) audioRef.current.volume = val[0] / 100;
            }}
          />
        </div>
      </div>
    </div>
  );
};