import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Music, Clock, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMusicStore } from '@/store/useMusicStore';

export const PlaybackHistoryModal = () => {
  const { playbackLogs, tracks, artists } = useMusicStore();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 p-0 h-auto">
          Show All
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <History className="text-blue-500" />
            Full Playback History
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 mt-4">
          <div className="space-y-2">
            {playbackLogs.map((log, i) => {
              const track = tracks.find(t => t.id === log.trackId);
              const artist = artists.find(a => a.id === track?.artistId);
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-900/50 hover:bg-zinc-900/50 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-blue-500 transition-colors">
                      <Music size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{track?.title || 'Unknown Track'}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{artist?.name || 'Unknown Artist'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1 justify-end">
                        <Clock size={10} />
                        {log.duration ? `${Math.floor(log.duration / 60)}:${(log.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                      </p>
                    </div>
                    <div className="w-24">
                      <p className="text-[10px] font-bold text-zinc-400">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</p>
                      {log.isSkip && (
                        <Badge variant="outline" className="text-[8px] border-red-900/50 text-red-500 bg-red-500/5 mt-1">
                          <SkipForward size={8} className="mr-1" /> Skip
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};