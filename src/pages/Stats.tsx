import { useEffect, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Play, SkipForward, Activity, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const Stats = () => {
  const { tracks, playbackLogs, fetchData } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  const topTracks = useMemo(() => {
    const trackStats = tracks.map(track => {
      const logs = playbackLogs.filter(l => l.trackId === track.id);
      const fullPlays = logs.filter(l => !l.isSkip && l.duration > 30).length;
      const partialPlays = logs.filter(l => l.isSkip || (l.duration !== null && l.duration <= 30)).length;
      return {
        name: track.title,
        fullPlays,
        partialPlays,
        total: fullPlays + partialPlays
      };
    });
    return trackStats.sort((a, b) => b.fullPlays - a.fullPlays).slice(0, 10);
  }, [tracks, playbackLogs]);

  const totalSeconds = playbackLogs.reduce((a, b) => a + (b.duration || 0), 0);
  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const skipRate = useMemo(() => {
    if (playbackLogs.length === 0) return '0%';
    const skips = playbackLogs.filter(l => l.isSkip).length;
    return `${((skips / playbackLogs.length) * 100).toFixed(1)}%`;
  }, [playbackLogs]);

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playback Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Insights into your listening patterns and engagement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Play} label="Total Plays" value={playbackLogs.length.toString()} color="text-blue-500" />
        <StatCard icon={Clock} label="Time Listened" value={formatTotalTime(totalSeconds)} color="text-emerald-500" />
        <StatCard icon={SkipForward} label="Skip Rate" value={skipRate} color="text-red-500" />
        <StatCard icon={Activity} label="Active Tracks" value={new Set(playbackLogs.map(l => l.trackId)).size.toString()} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Top Tracks (Full vs Partial)</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTracks} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Bar dataKey="fullPlays" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="partialPlays" stackId="a" fill="#3b82f6" opacity={0.3} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <History size={16} className="text-zinc-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            {playbackLogs.slice(0, 10).map((log, i) => {
              const track = tracks.find(t => t.id === log.trackId);
              return (
                <div key={i} className="flex items-center justify-between group">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">{track?.title || 'Unknown Track'}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</p>
                  </div>
                  {log.isSkip && <Badge variant="outline" className="text-[8px] border-red-900/50 text-red-500 bg-red-500/5">Skip</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-2">
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
  </Card>
);

export default Stats;
