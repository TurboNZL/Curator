"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, FileWarning, Database, Swords, Play, Pause, SkipForward, Equal, Image as ImageIcon, Music, Calendar, User, Tag, ThumbsUp, Filter, Shuffle as ShuffleIcon, ExternalLink, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Rating } from '@/components/ui/Rating';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { EditArtistModal } from '@/components/modals/EditArtistModal';
import { EditAlbumModal } from '@/components/modals/EditAlbumModal';
import { EditReleaseModal } from '@/components/modals/EditReleaseModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Cleanup = () => {
  const { tracks, albums, artists, releases, resetDatabase, vote, volume, updateTrack } = useMusicStore();
  const [pair, setPair] = useState<[any, any] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [filters, setFilters] = useState({
    artist_image: true,
    album_cover: true,
    spotify_uri: true,
    producers: true,
    release_date: true,
    genres: true,
    genius_link: true,
    youtube_link: true,
  });

  const [resolveGroup, setResolveGroup] = useState<{ albumId: string, tracks: any[] } | null>(null);
  const [pastedUris, setPastedUris] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const allTasks = useMemo(() => {
    const t = [
      ...artists.filter(a => !a.image).map(a => ({ type: 'artist_image', entity: a, label: `Add image for ${a.name}`, icon: User, color: 'text-purple-500' })),
      ...albums.filter(al => !al.covers || al.covers.length === 0).map(al => ({ type: 'album_cover', entity: al, label: `Add cover for ${al.title}`, icon: ImageIcon, color: 'text-blue-500' })),
      ...tracks.filter(t => !t.spotifyUrl).map(t => ({ type: 'spotify_uri', entity: t, label: `Add Spotify link for ${t.title}`, icon: Music, color: 'text-green-500' })),
      ...tracks.filter(t => t.producers.length === 0).map(t => ({ type: 'producers', entity: t, label: `Add producers for ${t.title}`, icon: Tag, color: 'text-yellow-500' })),
      ...releases.filter(r => !r.releaseDate).map(r => ({ type: 'release_date', entity: r, label: `Add date for ${r.title}`, icon: Calendar, color: 'text-orange-500' })),
      ...tracks.filter(t => t.genres.length === 0).map(t => ({ type: 'genres', entity: t, label: `Add genres for ${t.title}`, icon: Tag, color: 'text-pink-500' })),
      ...tracks.filter(t => !t.geniusUrl).map(t => ({ type: 'genius_link', entity: t, label: `Add Genius link for ${t.title}`, icon: ExternalLink, color: 'text-yellow-400' })),
      ...tracks.filter(t => !t.youtubeMusicUrl).map(t => ({ type: 'youtube_link', entity: t, label: `Add YouTube link for ${t.title}`, icon: Play, color: 'text-red-500' })),
    ];

    let filtered = t.filter(task => filters[task.type as keyof typeof filters]);
    if (isShuffled) filtered = [...filtered].sort(() => Math.random() - 0.5);
    return filtered;
  }, [artists, albums, tracks, releases, filters, isShuffled]);

  const groupedSpotifyTasks = useMemo(() => {
    const spotifyTasks = tracks.filter(t => !t.spotifyUrl);
    const groups: { [key: string]: any[] } = {};
    
    spotifyTasks.forEach(t => {
      const albumId = t.albumIds[0] || 'standalone';
      if (!groups[albumId]) groups[albumId] = [];
      groups[albumId].push(t);
    });

    return Object.entries(groups)
      .filter(([_, ts]) => ts.length > 1)
      .map(([albumId, ts]) => ({
        albumId,
        albumTitle: albums.find(a => a.id === albumId)?.title || 'Standalone',
        tracks: ts,
        label: `Bulk resolve Spotify URIs for ${albums.find(a => a.id === albumId)?.title || 'Standalone'}`,
        icon: Copy,
        color: 'text-emerald-500',
        type: 'spotify_group'
      }));
  }, [tracks, albums]);

  const tasks = useMemo(() => {
    const groupedTrackIds = new Set(groupedSpotifyTasks.flatMap(g => g.tracks.map(t => t.id)));
    const individualTasks = allTasks.filter(t => !(t.type === 'spotify_uri' && groupedTrackIds.has(t.entity.id)));
    return [...groupedSpotifyTasks, ...individualTasks];
  }, [allTasks, groupedSpotifyTasks]);

  const handleBulkPaste = (text: string) => {
    const uris = text.split(/\s+/).map(u => u.trim()).filter(u => u.startsWith('http'));
    setPastedUris(uris);
  };

  const resolveBulk = async () => {
    if (!resolveGroup) return;
    for (let i = 0; i < resolveGroup.tracks.length; i++) {
      if (pastedUris[i]) {
        await updateTrack(resolveGroup.tracks[i].id, { spotifyUrl: pastedUris[i] });
      }
    }
    setResolveGroup(null);
    setPastedUris([]);
    toast.success("Bulk URIs resolved");
  };

  const pickNewPair = () => {
    if (tracks.length < 2) return;
    const t1 = tracks[Math.floor(Math.random() * tracks.length)];
    let t2 = tracks[Math.floor(Math.random() * tracks.length)];
    while (t2.id === t1.id) t2 = tracks[Math.floor(Math.random() * tracks.length)];
    setPair([t1, t2]);
    setPlayingId(null);
    audioRef.current?.pause();
  };

  useEffect(() => {
    if (!pair && tracks.length >= 2) pickNewPair();
  }, [tracks, pair]);

  const handleVote = async (winnerId?: string, isEqual?: boolean) => {
    if (!pair) return;
    await vote({ trackAId: pair[0].id, trackBId: pair[1].id, winnerId, isEqual });
    toast.success(isEqual ? "Marked as equal" : "Vote recorded");
    pickNewPair();
  };

  const playSnippet = (track: any) => {
    if (playingId === track.id) {
      setPlayingId(null);
      audioRef.current?.pause();
      return;
    }
    if (!track.localFilePath) return toast.error("No local file");
    setPlayingId(track.id);
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = track.localFilePath;
    audioRef.current.onloadedmetadata = () => {
      const start = Math.max(0, (audioRef.current!.duration / 2) - 7.5);
      audioRef.current!.currentTime = start;
      audioRef.current!.play();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        audioRef.current?.pause();
        setPlayingId(null);
      }, 15000);
    };
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Library Cleanup</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Maintain your catalog integrity and optimize storage.</p>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Swords size={20} /></div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">This or That</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Refine balanced ratings through direct comparison</p>
          </div>
        </div>

        {pair && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-900 flex items-center justify-center text-zinc-500 font-black italic text-xl shadow-2xl">VS</div>
            </div>
            {pair.map((track) => (
              <div key={track.id} className="space-y-4">
                <Card className="group relative overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => playSnippet(track)}>
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img src={albums.find(a => track.albumIds?.includes(a.id))?.covers[0] || '/placeholder.svg'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl">{playingId === track.id ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-white uppercase truncate leading-tight">{track.title}</h3>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-tight mt-1">{albums.find(a => track.albumIds?.includes(a.id))?.title}</p>
                      </div>
                      <Rating trackId={track.id} balanced={track.rating} unbalanced={track.initialRating} comparisons={track.comparisons} size="md" />
                    </div>
                  </div>
                </Card>
                <Button onClick={() => handleVote(track.id)} className="w-full bg-zinc-900 border border-zinc-800 hover:bg-blue-600 hover:border-blue-500 text-white font-black uppercase tracking-widest h-12 gap-2"><ThumbsUp size={16} /> Vote for this</Button>
              </div>
            ))}
            <div className="md:col-span-2 flex justify-center gap-4 pt-4">
              <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2" onClick={() => handleVote(undefined, true)}><Equal size={14} /> Equal</Button>
              <Button variant="ghost" className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2" onClick={pickNewPair}><SkipForward size={14} /> Skip Pairing</Button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><AlertTriangle size={20} /></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Task Queue</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Missing or incomplete metadata</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className={cn("h-8 w-8", isShuffled ? "text-blue-500" : "text-zinc-500")} onClick={() => setIsShuffled(!isShuffled)}><ShuffleIcon size={16} /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500"><Filter size={16} /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white w-48">
                  {Object.keys(filters).map(k => (
                    <DropdownMenuCheckboxItem key={k} checked={filters[k as keyof typeof filters]} onCheckedChange={(v) => setFilters({...filters, [k]: v})}>{k.replace('_', ' ')}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg bg-zinc-950 border border-zinc-800", task.color)}><task.icon size={16} /></div>
                    <span className="text-xs font-bold text-zinc-300">{task.label}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.type === 'spotify_group' ? (
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-emerald-500" onClick={() => setResolveGroup({ albumId: task.albumId, tracks: task.tracks })}>Resolve Group</Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-500">Resolve</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={!!resolveGroup} onOpenChange={(o) => !o && setResolveGroup(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">Bulk Resolve Spotify URIs</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Paste Spotify Links</Label>
              <textarea className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Paste multiple links here..." onChange={(e) => handleBulkPaste(e.target.value)} />
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Preview Mapping</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {resolveGroup?.tracks.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-4 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{track.title}</p></div>
                    <div className="flex-1 min-w-0">{pastedUris[i] ? <p className="text-[10px] font-mono text-emerald-500 truncate">{pastedUris[i]}</p> : <p className="text-[10px] font-mono text-zinc-600 italic">Missing link</p>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveGroup(null)} className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
            <Button onClick={resolveBulk} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-8">Resolve All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cleanup;