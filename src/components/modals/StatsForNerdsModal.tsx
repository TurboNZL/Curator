import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, FileAudio, Database, HardDrive, Calendar, Globe, ExternalLink, Activity, Music, Star, Swords, Play, Clock } from 'lucide-react';
import { Track, Album, Artist } from '@/types/music';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';

interface StatsForNerdsModalProps {
  track?: Track;
  album?: Album;
  artist?: Artist;
  children: React.ReactElement; // Enforce single React element
}

export const StatsForNerdsModal = ({ track, album, artist, children }: StatsForNerdsModalProps) => {
  const { playbackLogs } = useMusicStore();
  if (!track) return children; // Return children directly if no track, as it's just a trigger

  const trackLogs = playbackLogs.filter(l => l.trackId === track.id);
  const playCount = trackLogs.length;
  const totalPlaytime = trackLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

  const formatPlaytime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const links = [
    { label: 'Spotify', url: track.spotifyUrl, color: 'text-green-500' },
    { label: 'Genius', url: track.geniusUrl, color: 'text-yellow-500' },
    { label: 'YouTube Music', url: track.youtubeMusicUrl, color: 'text-red-500' },
  ].filter(l => l.url);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Info size={20} className="text-blue-500" />
            Stats for Nerds
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 gap-3">
            <StatRow icon={Play} label="Play Count" value={playCount.toString()} />
            <StatRow icon={Clock} label="Total Playtime" value={formatPlaytime(totalPlaytime)} />
            <StatRow icon={FileAudio} label="Bitrate" value={track.bitrate || 'Unknown'} />
            <StatRow icon={Database} label="Track ID" value={track.id} />
            <StatRow icon={HardDrive} label="Local Path" value={track.localFilePath || 'N/A'} />
          </div>

          <div className="pt-4 border-t border-zinc-900">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Rating Metrics</h4>
            <div className="grid grid-cols-1 gap-3">
              <StatRow icon={Star} label="Initial Rating" value={track.initialRating?.toFixed(2) || 'N/A'} />
              <StatRow icon={Star} label="Balanced Rating" value={track.rating?.toFixed(2) || 'N/A'} className="text-blue-400" />
              <StatRow icon={Swords} label="Comparisons" value={track.comparisons.toString()} />
              <StatRow icon={Activity} label="Elo Score" value={track.eloScore.toFixed(0)} />
            </div>
          </div>
          
          {links.length > 0 && (
            <div className="pt-4 border-t border-zinc-900">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Platform Links</h4>
              <div className="grid grid-cols-2 gap-2">
                {links.map(link => (
                  <a 
                    key={link.label} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors group"
                  >
                    <span className={cn("text-[10px] font-bold uppercase", link.color)}>{link.label}</span>
                    <ExternalLink size={10} className="text-zinc-600 group-hover:text-white" />
                  </a>
                ))}
              </div>
            </div>
          )}
          
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
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Producers</span>
                <span className="text-white font-bold truncate max-w-[250px]">{track.producers.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Writers</span>
                <span className="text-white font-bold truncate max-w-[250px]">{track.writers.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatRow = ({ icon: Icon, label, value, className }: { icon: any, label: string, value: string, className?: string }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded bg-zinc-900 text-zinc-500 group-hover:text-blue-400 transition-colors">
        <Icon size={14} />
      </div>
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
    </div>
    <span className={cn("text-xs font-mono text-zinc-300 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50 truncate max-w-[200px]", className)}>
      {value}
    </span>
  </div>
);