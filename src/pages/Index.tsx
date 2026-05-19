import { useEffect, useMemo, useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Plus, History, CheckCircle2, BarChart3, TrendingUp, Activity, Users, Disc, Music, Layers, Trash2, Edit2 } from 'lucide-react';
import { CreateJournalEntryModal } from '@/components/modals/CreateJournalEntryModal';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';


const Index = () => {
  const { timeline, artists, albums, tracks, releases, groups, fetchData, isLoading } = useMusicStore();
  const [showAllEdits, setShowAllEdits] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const editsPerPage = 5;

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
    ];
    tracks.forEach(t => {
      // Treat 0.0 or null/undefined ratings as falling into the lowest (0-2) category
      if (t.rating === undefined || t.rating === null || t.rating < 0.001) ranges[0].count++;
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

  const completionPercentage = useMemo(() => {
    if (tracks.length === 0) return '0%';
    const completedTracks = tracks.filter(t => 
      (t.comparisons && t.comparisons >= 3) || 
      (t.initialRating !== undefined && t.initialRating !== null && t.initialRating > 0)
    );
    return `${((completedTracks.length / tracks.length) * 100).toFixed(0)}%`;
  }, [tracks]);

  const allEdits = useMemo(() => {
    // For simplicity, consider any timeline entry that isn't a direct rating update or simple playback log as an "edit"
    // In a real app, you'd have specific timeline types for 'track_updated', 'album_created', etc.
    // For now, filtering to show more than just basic entries.
    return timeline.filter(entry => entry.type !== 'playback' && entry.type !== 'rating');
  }, [timeline]);

  const paginatedEdits = useMemo(() => {
    if (showAllEdits) return allEdits;
    const startIndex = (currentPage - 1) * editsPerPage;
    return allEdits.slice(startIndex, startIndex + editsPerPage);
  }, [allEdits, showAllEdits, currentPage]);

  const totalPages = Math.ceil(allEdits.length / editsPerPage);

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

  const handleDeleteEntry = async (id: string) => {
    if (confirm("Delete this journal entry?")) {
      await fetch(`/api/timeline/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

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
        <StatCard icon={CheckCircle2} label="Completion" value={completionPercentage} color="text-emerald-500" />
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
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            {entry.timestamp ? format(new Date(entry.timestamp), 'HH:mm · MMM d, yyyy') : 'Recent'}
                          </span>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
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
                      <Cell key={`cell-${index}`} fill={'#eab308'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Edit History</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAllEdits(!showAllEdits)}
                className="h-7 text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400"
              >
                {showAllEdits ? 'Show Less' : 'Show All'}
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3 pr-4">
                {paginatedEdits.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic text-center py-4">No edits recorded yet.</p>
                ) : (
                  paginatedEdits.map(entry => (
                    <div key={entry.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{entry.title}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(entry.timestamp), 'MMM d, HH:mm')}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{entry.type}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            {!showAllEdits && totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
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