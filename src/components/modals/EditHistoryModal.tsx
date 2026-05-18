import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Edit3, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMusicStore } from '@/store/useMusicStore';
import { cn } from '@/lib/utils';

export const EditHistoryModal = () => {
  const { timeline, fetchData } = useMusicStore();
  const editEntries = timeline.filter(e => e.type === 'entry').sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const handleDeleteEntry = async (id: string) => {
    if (confirm("Delete this history entry?")) {
      await fetch(`/api/timeline/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-purple-500 hover:text-purple-400 p-0 h-auto">
          Show All Edits
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Edit3 className="text-purple-500" />
            Full Edit History
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 mt-4">
          <div className="space-y-2">
            {editEntries.map((entry, i) => (
              <div key={i} className="p-4 bg-zinc-900/30 border border-zinc-900/50 rounded-xl hover:bg-zinc-900/50 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {format(new Date(entry.timestamp), 'HH:mm · MMM d, yyyy')}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    {entry.type}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{entry.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{entry.description}</p>
              </div>
            ))}
            {editEntries.length === 0 && (
              <p className="text-xs text-zinc-600 italic text-center py-12">No edit history found.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
