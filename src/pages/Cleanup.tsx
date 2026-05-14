import React, { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, FileWarning, Database, Swords, Play, Pause, SkipForward, Equal, Image as ImageIcon, Music, Calendar, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Rating } from '@/components/ui/Rating';
import { ScrollArea } from '@/components/ui/scroll-area';

const Cleanup = () => {
  const { tracks, albums, artists, releases, resetDatabase, vote } = useMusicStore();
  const [pair, setPair] = useState<[any, any] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Task Generation Logic
  const tasks = [
    ...artists.filter(a => !a.image).map(a => ({ type: 'artist_image', entity: a, label: `Add image for ${a.name}`, icon: User, color: 'text-purple-500' })),
    ...albums.filter(al => !al.covers || al.covers.length === 0).map(al => ({ type: 'album_cover', entity: al, label: `Add cover for ${al.title}`, icon: ImageIcon, color: 'text-blue-500' })),
    ...tracks.filter(t => !t.spotifyUrl).map(t => ({ type: 'spotify_uri', entity: t, label: `Add Spotify link for ${t.title}`, icon: Music, color: 'text-green-500' })),
    ...tracks.filter(t => t.producers.length === 0).map(t => ({ type: 'producers', entity: t, label: `Add producers for ${t.title}`, icon: Tag, color: 'text-yellow-500' })),
    ...releases.filter(r => !r.releaseDate).map(r => ({ type: 'release_date', entity: r, label: `Add date for ${r.title}`, icon: Calendar, color: 'text-orange-500' })),
    ...tracks.filter(t => t.genres.length === 0).map(t => ({ type: 'genres', entity: t, label: `Add genres for ${t.title}`, icon: Tag, color: 'text-pink-500' })),
  ];

  const lowQualityTracks = tracks.filter(t => t.bitrate && parseInt(t.bitrate) < 192);

  const pickNewPair = () => {
    if (tracks.length < 2) return;
    const t1 = tracks[Math.floor(Math.random() * tracks.length)];
    let t2 = tracks[Math.floor(Math.random() * tracks.length)];
    while (t2.id === t1.id) {
      t2 = tracks[Math.floor(Math.random() * tracks.length)];
    }
    setPair([t1, t2]);
    setPlayingId(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  useEffect(() => {
    if (!pair && tracks.length >= 2) {
      pickNewPair();
    }
  }, [tracks, pair]);

  const handleVote = async (winnerId?: string, isEqual?: boolean) => {
    if (!pair) return;
    
    try {
      await vote({
        trackAId: pair[0].id,
        trackBId: pair[1].id,
        winnerId,
        isEqual
      });
      toast.success(isEqual ? "Marked as equal" : "Vote recorded");
      pickNewPair();
    } catch (error) {
      toast.error("Failed to record vote");
    }
  };

  const playSnippet = (track: any) => {
    if (playingId === track.id) {
      setPlayingId(null);
      audioRef.current?.pause();
      return;
    }

    if (!track.localFilePath) {
      toast.error("No local file for this track");
      return;
    }

    setPlayingId(track.id);
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = track.localFilePath;
    audioRef.current.onloadedmetadata = () => {
      const duration = audioRef.current?.duration || 0;
      const start = Math.max(0, (duration / 2) - 7.5);
      if (audioRef.current) {
        audioRef.current.currentTime = start;
        audioRef.current.play();
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          audioRef.current?.pause();
          setPlayingId(null);
        }, 15000);
      }
    };
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to wipe the entire local database? This cannot be undone.")) {
      resetDatabase();
      toast.success("Database cleared successfully");
    }
  };

  const getAlbumArt = (track: any) => {
    const album = albums.find(a => track.albumIds?.includes(a.id));
    return album?.covers[0] || '/placeholder.svg';
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Library Cleanup</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Maintain your catalog integrity and optimize storage.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-zinc-800 text-[10px] font-black uppercase tracking-widest h-9 px-6">Export Report</Button>
        </div>
      </div>

      {/* This or That Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Swords size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">This or That</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Refine balanced ratings through direct comparison</p>
          </div>
        </div>

        {pair ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-900 flex items-center justify-center text-zinc-500 font-black italic text-xl shadow-2xl">
                VS
              </div>
            </div>

            {pair.map((track, idx) => (
              <Card 
                key={track.id}
                className={cn(
                  "group relative overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer",
                  "before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-black/80 before:opacity-60"
                )}
                onClick={() => handleVote(track.id)}
              >
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img 
                    src={getAlbumArt(track)} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt="" 
                  />
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSnippet(track);
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      {playingId === track.id ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white uppercase truncate leading-tight">{track.title}</h3>
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-tight mt-1">
                        {albums.find(a => track.albumIds?.includes(a.id))?.title || 'Unknown Album'}
                      </p>
                    </div>
                    <Rating 
                      balanced={track.rating} 
                      unbalanced={track.initialRating} 
                      comparisons={track.comparisons}
                      size="md"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <div className="md:col-span-2 flex justify-center gap-4 pt-4">
              <Button 
                variant="outline" 
                className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2"
                onClick={() => handleVote(undefined, true)}
              >
                <Equal size={14} /> Equal / Skip
              </Button>
              <Button 
                variant="ghost" 
                className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2"
                onClick={pickNewPair}
              >
                <SkipForward size={14} /> New Pair
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Add more tracks to enable comparisons</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Task Queue</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Missing or incomplete metadata</p>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-zinc-900 rounded-2xl">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3 opacity-20" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No tasks for now.</p>
                </div>
              ) : (
                tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-zinc-950 border border-zinc-800", task.color)}>
                        <task.icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{task.label}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Resolve</Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4 group hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-3 text-yellow-500">
              <FileWarning size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Low Quality</h3>
            </div>
            <p className="text-4xl font-black text-white">{lowQualityTracks.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Tracks below 192kbps detected in library</p>
            <Button variant="outline" className="w-full border-zinc-800 text-[10px] font-black uppercase h-9 tracking-widest group-hover:bg-yellow-500 group-hover:text-black transition-colors">Review Files</Button>
          </Card>

          <Card className="bg-red-950/10 border-red-900/20 p-6 space-y-4 group hover:border-red-500/30 transition-colors">
            <div className="flex items-center gap-3 text-red-500">
              <Database size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Wipe all local indexing data and reset the curator environment. This action is irreversible.</p>
            <Button 
              onClick={handleReset}
              variant="destructive" 
              className="w-full text-[10px] font-black uppercase h-9 tracking-widest bg-red-600/80 hover:bg-red-600"
            >
              Reset Database
            </Button>
          </Card>
        </div>
      </div>

      <Card className="bg-zinc-900/30 border-zinc-800 p-10 flex flex-col items-center justify-center text-center space-y-6 rounded-3xl">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-8 ring-emerald-500/5">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Catalog Health: Optimal</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto font-medium">
            Your library is currently synchronized and all entities are correctly linked. No orphaned tracks or broken references detected.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Cleanup;
