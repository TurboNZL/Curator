import { useEffect, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Play, SkipForward, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Stats = () => {
  const { tracks, playbackLogs, fetchData } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  const topTracks = useMemo(() => {
    const trackStats = tracks.map(track => {
      const logs = playbackLogs.filter(l => l.trackId === track.id);
      const fullPlays = logs.filter(l => !l.isSkip && l.duration > 30).length;
      const partialPlays = logs.filter(l => l.isSkip || l.duration <= 30).length;
      return {
        name: track.title,
        fullPlays,
        partialPlays,
        total: fullPlays + partialPlays
      };
    });
    return trackStats.sort((a, b) => b.fullPlays - a.fullPlays).slice(0, 10);
  }, [tracks, playbackLogs]);

  const ratingDistribution = useMemo(() => {
    const ranges = [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 0 },
      { range: '4-6', count: 0 },
      { range: '6-8', count: 0 },
      { range: '8-10', count: 0 },
      { range: 'Unrated', count: 0 },
    ];
    tracks.forEach(t => {
      if (t.rating === undefined) ranges[5].count++;
      else if (t.rating < 2) ranges[0].count++;
      else if (t.rating < 4) ranges[1].count++;
      else if (t.rating < 6) ranges[2].count++;
      else if (t.rating < 8) ranges[3].count++;
      else ranges[4].count++;
    });
    return ranges;
  }, [tracks]);

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Curation Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Deep insights into your listening habits and library health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Play} label="Total Plays" value={playbackLogs.length.toString()} color="text-blue-500" />
        <StatCard icon={TrendingUp} label="Avg. Rating" value={(tracks.filter(t => t.rating !== undefined).reduce((a, b) => a + (b.rating || 0), 0) / (tracks.filter(t => t.rating !== undefined).length || 1)).toFixed(2)} color="text-yellow-500" />
        <StatCard icon={Clock} label="Time Listened" value={`${Math.floor(playbackLogs.reduce((a, b) => a + (b.duration || 0), 0) / 3600)}h`} color="text-emerald-500" />
        <StatCard icon={Activity} label="Library Size" value={tracks.length.toString()} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Top Tracks (Full vs Partial)</h3>
          </div>
          <div className="h-[300px] w-full">
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
            <Activity size={16} className="text-yellow-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Rating Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#18181b' }}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} barSize={40}>
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.range === 'Unrated' ? '#3f3f46' : '#eab308'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
