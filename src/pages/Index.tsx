import { useEffect, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Plus, History, CheckCircle2, BarChart3, TrendingUp, Activity, Users, Disc, Music, Layers } from 'lucide-react';
import { CreateJournalEntryModal } from '@/components/modals/CreateJournalEntryModal';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { timeline, artists, albums, tracks, releases, groups, fetchData, isLoading } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

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
      if (t.rating === undefined || t.rating === null) ranges[5].count++;
      else if (t.rating < 2) ranges[0].count++;
      else if (t.rating < 4) ranges[1].count++;
      else if (t.rating < 6) ranges[2].count++;
      else if (t.rating < 8) ranges[3].count++;
      else ranges[4].count++;
    });
    return ranges;
  }, [tracks]);

  const avgRating = useMemo(() => {
    const ratedTracks = tracks.filter(t => t.rating !== undefined && t.rating !== null);
    if (ratedTracks.length === 0) return '0.00';
    return (ratedTracks.reduce((a, b) => a + (b.rating || 0), 0) / ratedTracks.length).toFixed(2);
  }, [tracks]);

  if (isLoading && (!timeline || timeline.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const artistsCount = artists?.length || 0;
  const albumsCount = albums?.length || 0;
  const tracksCount = tracks?.length || 0;
  const releasesCount = releases?.length || 0;
  const groupsCount = groups?.length || 0;
  const timelineEntries = timeline || [];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Curation Journal</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Documenting your journey through sound and structure.</p>
        </div>
        <div className="flex gap-4">
          <CreateJournalEntryModal>
            <Button className="bg-purple-600 hover:bg-purple-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
              <Plus size={16} /> New Entry
            </Button>
          </CreateJournalEntryModal>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Activity} label="Library Size" value={tracksCount.toString()} color="text-purple-500" />
        <StatCard icon={TrendingUp} label="Avg. Rating" value={avgRating} color="text-yellow-500" />
        <StatCard icon={Users} label="Relational Bios" value={groupsCount.toString()} color="text-blue-500" />
        <StatCard icon={CheckCircle2} label="Completion" value={`${((tracks.filter(t => t.rating !== undefined && t.rating !== null).length / (tracksCount || 1)) * 100).toFixed(0)}%`} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <History size={20} className="text-purple-500" />
                Timeline
              </h2>
            </div>

            <div className="space-y-4">
              {timelineEntries.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-zinc-300 font-medium">No timeline events yet</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mt-1">
                    Start by adding an artist or creating a manual journal entry.
                  </p>
                </div>
              ) : (
                timelineEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex gap-4 group hover:border-zinc-700 transition-colors">
                    <div className={cn(
                      "w-1 rounded-full",
                      entry.type === 'rating' ? "bg-emerald-500" : "bg-purple-500"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {entry.timestamp ? format(new Date(entry.timestamp), 'HH:mm · MMM d, yyyy') : 'Recent'}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                          {entry.type}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{entry.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{entry.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={16} className="text-yellow-500" />
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

          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Catalog Health</h3>
            <div className="space-y-4">
              <StatItem label="Artists" value={artistsCount.toString()} icon={Users} color="text-violet-500" />
              <StatItem label="Albums" value={albumsCount.toString()} icon={Disc} color="text-indigo-500" />
              <StatItem label="Releases" value={releasesCount.toString()} icon={Layers} color="text-blue-500" />
              <StatItem label="Tracks" value={tracksCount.toString()} icon={Music} color="text-emerald-500" />
            </div>
          </Card>
        </div>
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

const StatItem = ({ label, value, icon: Icon, color }: any) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className={color} />}
      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors font-bold uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-sm font-mono font-bold text-white">{value}</span>
  </div>
);

export default Index;