import { useEffect } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Plus, History, CheckCircle2, BarChart3 } from 'lucide-react';
import { CreateJournalEntryModal } from '@/components/modals/CreateJournalEntryModal';
import { cn } from '@/lib/utils';

const Index = () => {
  const { timeline, artists, albums, tracks, fetchData, isLoading } = useMusicStore();

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading && timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History size={24} className="text-purple-500" />
            Journal
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-bold bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400">Filter</button>
            <CreateJournalEntryModal>
              <button className="px-3 py-1 text-xs font-bold bg-purple-600 rounded-full hover:bg-purple-500 text-white flex items-center gap-1">
                <Plus size={14} /> Entry
              </button>
            </CreateJournalEntryModal>
          </div>
        </div>

        <div className="space-y-4">
          {timeline.length === 0 ? (
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
            timeline.map((entry) => (
              <div key={entry.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex gap-4 group hover:border-zinc-700 transition-colors">
                <div className={cn(
                  "w-1 rounded-full",
                  entry.type === 'rating' ? "bg-emerald-500" : "bg-purple-500"
                )} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {format(new Date(entry.timestamp), 'HH:mm · MMM d, yyyy')}
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
      </div>

      <div className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Completion Status</h3>
          <div className="space-y-4">
            <StatItem label="Albums Fully Completed" value={albums.length.toString()} icon={CheckCircle2} color="text-green-500" />
            <StatItem label="Releases Indexed" value={useMusicStore.getState().releases.length.toString()} />
            <StatItem label="Artists Entered" value={artists.length.toString()} />
            <StatItem label="Total Tracks" value={tracks.length.toString()} />
          </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 size={80} className="text-purple-500" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Listening Stats</h3>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">0.0h</div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Time spent curating this week</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, icon: Icon, color }: any) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className={color} />}
      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
    </div>
    <span className="text-sm font-mono font-bold text-white">{value}</span>
  </div>
);

export default Index;