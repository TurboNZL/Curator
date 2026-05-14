import { AppShell } from '@/components/layout/AppShell';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Trash2, AlertTriangle, CheckCircle2, FileWarning, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Cleanup = () => {
  const { tracks, resetDatabase } = useMusicStore();

  const lowQualityTracks = tracks.filter(t => t.bitrate && parseInt(t.bitrate) < 192);
  const missingMetadata = tracks.filter(t => t.genres.length === 0 || t.producers.length === 0);

  const handleReset = () => {
    if (confirm("Are you sure you want to wipe the entire local database? This cannot be undone.")) {
      resetDatabase();
      toast.success("Database cleared successfully");
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Library Cleanup</h1>
          <p className="text-zinc-500 text-sm mt-1">Maintain your catalog integrity and optimize storage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-yellow-500">
              <FileWarning size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Low Quality</h3>
            </div>
            <p className="text-3xl font-black text-white">{lowQualityTracks.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Tracks below 192kbps</p>
            <Button variant="outline" className="w-full border-zinc-800 text-[10px] font-bold uppercase h-8">Review Files</Button>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
              <AlertTriangle size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Missing Meta</h3>
            </div>
            <p className="text-3xl font-black text-white">{missingMetadata.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Incomplete track data</p>
            <Button variant="outline" className="w-full border-zinc-800 text-[10px] font-bold uppercase h-8">Auto-Fill</Button>
          </Card>

          <Card className="bg-red-950/20 border-red-900/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <Database size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">Wipe all local indexing data and reset the curator environment.</p>
            <Button 
              onClick={handleReset}
              variant="destructive" 
              className="w-full text-[10px] font-bold uppercase h-8 bg-red-600 hover:bg-red-500"
            >
              Reset Database
            </Button>
          </Card>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Catalog Health: Optimal</h3>
            <p className="text-sm text-zinc-500 max-w-md mt-1">
              Your library is currently synchronized and all entities are correctly linked. No orphaned tracks detected.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Cleanup;