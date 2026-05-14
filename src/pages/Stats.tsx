import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Music2, Disc, Users, Clock, PlayCircle } from 'lucide-react';

const Stats = () => {
  const { artists, albums, tracks, playbackLogs } = useMusicStore();

  // Catalog Stats
  const genreData = tracks.reduce((acc: any[], track) => {
    track.genres.forEach(genre => {
      const existing = acc.find(d => d.name === genre);
      if (existing) existing.value++;
      else acc.push({ name: genre, value: 1 });
    });
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  const ratingDistribution = [
    { range: '0-2', count: tracks.filter(t => t.rating < 2).length },
    { range: '2-4', count: tracks.filter(t => t.rating >= 2 && t.rating < 4).length },
    { range: '4-6', count: tracks.filter(t => t.rating >= 4 && t.rating < 6).length },
    { range: '6-8', count: tracks.filter(t => t.rating >= 6 && t.rating < 8).length },
    { range: '8-10', count: tracks.filter(t => t.rating >= 8).length },
  ];

  // Playback Stats
  const totalListeningTime = playbackLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const totalPlays = playbackLogs.length;

  const mostPlayedTracks = playbackLogs.reduce((acc: any[], log) => {
    const existing = acc.find(d => d.trackId === log.trackId);
    if (existing) existing.count++;
    else acc.push({ trackId: log.trackId, count: 1 });
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 5).map(d => ({
    name: tracks.find(t => t.id === d.trackId)?.title || 'Unknown',
    count: d.count
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-12">
      <section className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Catalog Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">Deep dive into your curation metrics and library distribution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Artists" value={artists.length} color="text-blue-500" />
          <StatCard icon={Disc} label="Total Albums" value={albums.length} color="text-emerald-500" />
          <StatCard icon={Music2} label="Total Tracks" value={tracks.length} color="text-purple-500" />
          <StatCard icon={TrendingUp} label="Avg. Rating" value={(tracks.reduce((a, b) => a + b.rating, 0) / (tracks.length || 1)).toFixed(2)} color="text-yellow-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <PieIcon size={14} /> Genre Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genreData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {genreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <BarChart3 size={14} /> Rating Spread
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="range" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">Playback Analytics</h2>
          <p className="text-zinc-500 text-sm mt-1">Tracking your listening habits and session history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard icon={Clock} label="Listening Time" value={`${(totalListeningTime / 3600).toFixed(1)}h`} color="text-orange-500" />
          <StatCard icon={PlayCircle} label="Total Plays" value={totalPlays} color="text-pink-500" />
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
            <TrendingUp size={14} /> Most Played Tracks
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostPlayedTracks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} width={100} />
                <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card className="bg-zinc-900/50 border-zinc-800 p-6 group hover:border-zinc-700 transition-colors">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
      <div className={cn("p-3 rounded-xl bg-zinc-950 border border-zinc-800 group-hover:scale-110 transition-transform", color)}>
        <Icon size={24} />
      </div>
    </div>
  </Card>
);

export default Stats;