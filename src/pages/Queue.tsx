import { useMusicStore } from '@/store/useMusicStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListOrdered, Trash2, Play, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Queue = () => {
  const { queue, tracks, artists, setCurrentTrack, removeFromQueue, clearQueue } = useMusicStore();

  const queueTracks = queue.map(id => tracks.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playback Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage the sequence of your current listening session.</p>
        </div>
        <Button 
          variant="ghost" 
          onClick={clearQueue}
          className="text-zinc-500 hover:text-red-500 gap-2 font-bold uppercase text-[10px]"
        >
          <Trash2 size={14} /> Clear Queue
        </Button>
      </div>

      {queueTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListOrdered size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">Queue is empty</h3>
          <p className="text-zinc-600 text-sm mt-1">Add tracks from your library to start a session.</p>
        </div>
      ) : (
        <Table>
          <TableHeader className="hover:bg-transparent border-zinc-900">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Artist</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueTracks.map((track, index) => {
              const artist = artists.find(a => a.id === track?.artistId);
              return (
                <TableRow 
                  key={`${track?.id}-${index}`} 
                  className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group"
                >
                  <TableCell>
                    <GripVertical size={14} className="text-zinc-700 group-hover:text-zinc-500 cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => track && setCurrentTrack(track.id)}
                        className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-blue-600 transition-colors"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <span className="text-sm font-bold text-white">{track?.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs font-medium">{artist?.name}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => track && removeFromQueue(track.id)}
                      className="text-zinc-600 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Queue;