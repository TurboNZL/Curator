import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, FileAudio, Database, HardDrive, Calendar } from 'lucide-react';
import { Track, Album, Artist } from '@/types/music';

interface StatsForNerdsModalProps {
  track?: Track;
  album?: Album;
  artist?: Artist;
  children: React.ReactNode;
}

export const StatsForNerdsModal = ({ track, album, artist, children }: StatsForNerdsModalProps) => {
  if (!track) return <>{children}</>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Info size={20} className="text-blue-500" />
            Stats for Nerds
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <StatRow icon={FileAudio} label="Bitrate" value={track.bitrate || 'Unknown'} />
            <StatRow icon={Database} label="Track ID" value={track.id} />
            <StatRow icon={HardDrive} label="Local Path" value={track.localFilePath || 'N/A'} />
            <StatRow icon={Calendar} label="Initial Rating" value={track.initialRating.toFixed(2)} />
            <StatRow icon={Info} label="Balanced Rating" value={track.rating.toFixed(2)} />
          </div>
          
          <div className="pt-4 border-t border-zinc-900">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Entity Relations</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Artist</span>
                <span className="text-white font-bold">{artist?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Album</span>
                <span className="text-white font-bold">{album?.title || 'Single'}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded bg-zinc-900 text-zinc-500 group-hover:text-blue-400 transition-colors">
        <Icon size={14} />
      </div>
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
    </div>
    <span className="text-xs font-mono text-zinc-300 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50 truncate max-w-[200px]">
      {value}
    </span>
  </div>
);