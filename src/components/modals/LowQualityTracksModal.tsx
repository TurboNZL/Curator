"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Play, Pause, Trash2, Edit2, Zap, AlertTriangle } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils'; // Import getAlbumDisplayCover
import { EditTrackModal } from './EditTrackModal';
import { TrackRightClickMenu } from '../ui/TrackRightClickMenu';
import { Rating } from '../ui/Rating'; // DO NOT CHANGE THE STYLE OF THE RATING CARD

interface LowQualityTracksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LowQualityTracksModal: React.FC<LowQualityTracksModalProps> = ({ open, onOpenChange }) => {
  const { tracks, artists, albums, releases, volume, deleteTrack, fetchData, activeProfile } = useMusicStore(); // Added releases, activeProfile
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<any>(null);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const lowQualityTracks = tracks.filter(t => t.bitrate && parseInt(t.bitrate) < 192);

  const getAlbumArt = (track: any) => {
    const album = albums.find(a => trackHasAlbum(track, a.id));
    // Use the new helper here
    return getAlbumDisplayCover(album, releases, activeProfile.settings?.defaultAlbumImage || '/placeholder.svg');
  };

  const getArtistName = (track: any) => {
    const artist = artists.find(a => a.id === track.artistId);
    return artist?.name || 'Unknown Artist';
  };

  const playSnippet = (track: any) => {
    if (playingId === track.id) {
      setPlayingId(null);
      audioRef.current?.pause();
      return;
    }

    if (!track.localFilePath) {
      toast.error("No local file for this track");
      return;
    }

    setPlayingId(track.id);
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = track.localFilePath;
    audioRef.current.volume = volume;
    audioRef.current.onloadedmetadata = () => {
      const duration = audioRef.current?.duration || 0;
      const start = Math.max(0, (duration / 2) - 7.5);
      if (audioRef.current) {
        audioRef.current.currentTime = start;
        audioRef.current.play();
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          audioRef.current?.pause();
          setPlayingId(null);
        }, 15000);
      }
    };
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (confirm("Are you sure you want to delete this track? This action cannot be undone.")) {
      try {
        await deleteTrack(trackId);
        toast.success("Track deleted successfully.");
        fetchData();
        if (playingId === trackId) {
          audioRef.current?.pause();
          setPlayingId(null);
        }
      } catch (error) {
        toast.error("Failed to delete track.");
      }
    }
  };

  const handleDeleteAllLowQuality = async () => {
    if (confirm("Are you sure you want to delete ALL low-quality tracks? This action cannot be undone.")) {
      try {
        const deletePromises = lowQualityTracks.map(track => deleteTrack(track.id));
        await Promise.all(deletePromises);
        toast.success("All low-quality tracks deleted.");
        fetchData();
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingId(null);
        }
        onOpenChange(false);
      } catch (error) {
        toast.error("Failed to delete all low-quality tracks.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            Low Quality Tracks
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          {lowQualityTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-2xl h-full">
              <AlertTriangle size={48} className="text-zinc-800 mb-4" />
              <h3 className="text-zinc-400 font-bold">No low quality tracks detected.</h3>
              <p className="text-zinc-600 text-sm mt-1">Your library is in pristine condition!</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4"> {/* Adjusted ScrollArea to take available height */}
              <div className="space-y-3">
                {lowQualityTracks.map((track) => (
                  <TrackRightClickMenu key={track.id} track={track}>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-zinc-600 w-4 shrink-0">{track.id}</span> {/* Using track.id instead of index + 1 */}
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          <img src={getAlbumArt(track)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{getArtistName(track)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full uppercase tracking-widest">{track.bitrate || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        {/* DO NOT CHANGE THE STYLE OF THE RATING CARD */}
                        <Rating track={track} size="sm" showEditor={false} /> 
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); playSnippet(track); }}>
                          {playingId === track.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrackForEdit(track);
                            setIsEditTrackModalOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id); }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </TrackRightClickMenu>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {lowQualityTracks.length > 0 && (
          <DialogFooter className="pt-4 border-t border-zinc-900">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllLowQuality}
              className="bg-red-600 hover:bg-red-500 font-bold uppercase tracking-wider"
            >
              <Trash2 size={16} className="mr-2" /> <span>Delete All {lowQualityTracks.length} Low Quality Tracks</span>
            </Button>
          </DialogFooter>
        )}
        {selectedTrackForEdit && (
          <EditTrackModal
            track={selectedTrackForEdit}
            open={isEditTrackModalOpen}
            onOpenChange={setIsEditTrackModalOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};