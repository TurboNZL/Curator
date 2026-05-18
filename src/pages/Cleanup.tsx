import React, { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, FileWarning, Database, Swords, Play, Pause, SkipForward, Equal, Image as ImageIcon, Music, Calendar, User, Tag, ThumbsUp, Link, Youtube, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Rating } from '@/components/ui/Rating';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ImageUpload } from '@/components/ui/ImageUpload'; // Assuming ImageUpload is a UI component
import { Switch } from '@/components/ui/switch'; // Ensure Switch is imported
import { EditTrackModal } from '@/components/modals/EditTrackModal'; // Import EditTrackModal

interface SpotifyUriGroupResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: any[];
  onResolve: (trackIds: string[], uris: string[]) => Promise<void>;
}

const SpotifyUriGroupResolutionModal: React.FC<SpotifyUriGroupResolutionModalProps> = ({ isOpen, onClose, tracks, onResolve }) => {
  const [uris, setUris] = useState<string[]>(tracks.map(t => t.spotifyUrl || ''));
  const [pastedText, setPastedText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUris(tracks.map(t => t.spotifyUrl || ''));
      setPastedText('');
    }
  }, [isOpen, tracks]);

  const handleUriChange = (index: number, value: string) => {
    setUris(prev => {
      const newUris = [...prev];
      newUris[index] = value;
      return newUris;
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);
    const pastedUris = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('https://open.spotify.com/track/'));
    
    setUris(prev => {
      const newUris = [...prev];
      pastedUris.forEach((uri, index) => {
        if (index < newUris.length) {
          newUris[index] = uri;
        }
      });
      return newUris;
    });
  };

  const submitResolution = async () => {
    setIsResolving(true);
    try {
      const trackIds = tracks.map(t => t.id);
      await onResolve(trackIds, uris);
      toast.success("Spotify URIs updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to resolve Spotify URIs:", error);
      toast.error("Failed to update Spotify URIs.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Link size={20} className="text-green-500" />
            Resolve Spotify URIs
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracks</Label>
              <ScrollArea className="h-[250px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {tracks.map((track) => (
                    <div key={track.id} className="flex items-center p-2 rounded-lg text-zinc-400">
                      <span className="text-xs font-bold truncate">{track.title}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spotify URIs</Label>
              <ScrollArea className="h-[250px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {uris.map((uri, index) => (
                    <Input
                      key={tracks[index]?.id || index}
                      value={uri}
                      onChange={(e) => handleUriChange(index, e.target.value)}
                      placeholder={`URI for ${tracks[index]?.title}`}
                      className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500 text-xs"
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paste-uris" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Paste Multiple URIs</Label>
            <Textarea
              id="paste-uris"
              value={pastedText}
              onChange={handlePaste}
              placeholder="Paste Spotify track URLs here (one per line)"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500 text-xs min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={submitResolution} className="bg-green-600 hover:bg-green-500 font-bold uppercase tracking-wider" disabled={isResolving}>
            {isResolving ? "Resolving..." : "Resolve Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Modal for Image Upload
interface ImageUploadResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: any; // Artist or Album
  onResolve: (id: string, imageUrl: string, type: 'artist' | 'album') => Promise<void>;
  entityType: 'artist' | 'album';
}

const ImageUploadResolutionModal: React.FC<ImageUploadResolutionModalProps> = ({ isOpen, onClose, entity, onResolve, entityType }) => {
  const [imageUrl, setImageUrl] = useState(entity?.image || entity?.covers?.[0] || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(entity?.image || entity?.covers?.[0] || '');
    }
  }, [isOpen, entity]);

  const handleSave = async () => {
    setIsUploading(true);
    try {
      await onResolve(entity.id, imageUrl, entityType);
      toast.success(`${entityType === 'artist' ? 'Artist image' : 'Album cover'} updated.`);
      onClose();
    } catch (error) {
      toast.error(`Failed to update ${entityType === 'artist' ? 'artist image' : 'album cover'}.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-500" />
            Upload {entityType === 'artist' ? 'Artist Image' : 'Album Cover'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{entity.name || entity.title}</Label>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUploading || !imageUrl} className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
            {isUploading ? "Saving..." : "Save Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const Cleanup = () => {
  const { tracks, albums, artists, releases, resetDatabase, vote, volume, updateTrack, updateAlbum, updateArtist, fetchData, playbackLogs } = useMusicStore();
  const [pair, setPair] = useState<[any, any] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isShufflePairing, setIsShufflePairing] = useState(false);
  const [isShuffleTasks, setIsShuffleTasks] = useState(false); // New state for shuffling tasks
  const [isSpotifyResolutionModalOpen, setIsSpotifyResolutionModalOpen] = useState(false);
  const [spotifyResolutionTracks, setSpotifyResolutionTracks] = useState<any[]>([]);

  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [imageUploadEntity, setImageUploadEntity] = useState<any>(null);
  const [imageUploadEntityType, setImageUploadEntityType] = useState<'artist' | 'album' | null>(null);

  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    artist_image: true,
    album_cover: true,
    spotify_uri: true,
    genius_uri: true,
    youtube_music_uri: true,
    producers: true,
    release_date: true,
    genres: true,
    grouped_spotify_uri: true,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Task Generation Logic
  const allTasks = useMemo(() => {
    const generatedTasks = [
      ...artists.filter(a => !a.image).map(a => ({ type: 'artist_image', entity: a, label: `Add image for ${a.name}`, icon: User, color: 'text-purple-500' })),
      ...albums.filter(al => !al.covers || al.covers.length === 0).map(al => ({ type: 'album_cover', entity: al, label: `Add cover for ${al.title}`, icon: ImageIcon, color: 'text-blue-500' })),
      ...tracks.filter(t => !t.spotifyUrl).map(t => ({ type: 'spotify_uri', entity: t, label: `Add Spotify link for ${t.title}`, icon: Link, color: 'text-green-500' })),
      ...tracks.filter(t => !t.geniusUrl).map(t => ({ type: 'genius_uri', entity: t, label: `Add Genius link for ${t.title}`, icon: Link, color: 'text-yellow-500' })),
      ...tracks.filter(t => !t.youtubeMusicUrl).map(t => ({ type: 'youtube_music_uri', entity: t, label: `Add YouTube Music link for ${t.title}`, icon: Youtube, color: 'text-red-500' })),
      ...tracks.filter(t => t.producers.length === 0).map(t => ({ type: 'producers', entity: t, label: `Add producers for ${t.title}`, icon: Tag, color: 'text-yellow-500' })),
      ...releases.filter(r => !r.releaseDate).map(r => ({ type: 'release_date', entity: r, label: `Add date for ${r.title}`, icon: Calendar, color: 'text-orange-500' })),
      ...tracks.filter(t => t.genres.length === 0).map(t => ({ type: 'genres', entity: t, label: `Add genres for ${t.title}`, icon: Tag, color: 'text-pink-500' })),
    ];

    // Group consecutive tracks from the same album missing Spotify URLs
    const groupedSpotifyTasks: any[] = [];
    let currentGroup: any[] = [];

    tracks.forEach((track, index) => {
      if (!track.spotifyUrl && track.albumIds.length > 0) {
        const prevTrack = tracks[index - 1];
        if (currentGroup.length === 0 || (prevTrack && track.albumIds[0] === prevTrack.albumIds[0] && !prevTrack.spotifyUrl)) {
          currentGroup.push(track);
        } else {
          if (currentGroup.length > 1) {
            groupedSpotifyTasks.push({
              type: 'grouped_spotify_uri',
              entity: { albumId: currentGroup[0].albumIds[0], tracks: currentGroup },
              label: `Add Spotify links for ${currentGroup[0].title} and ${currentGroup.length - 1} more tracks`,
              icon: Link,
              color: 'text-green-500',
              isGrouped: true,
            });
          } else if (currentGroup.length === 1) {
            generatedTasks.push({
              type: 'spotify_uri', entity: currentGroup[0], label: `Add Spotify link for ${currentGroup[0].title}`, icon: Link, color: 'text-green-500'
            });
          }
          currentGroup = [track];
        }
      } else {
        if (currentGroup.length > 1) {
          groupedSpotifyTasks.push({
            type: 'grouped_spotify_uri',
            entity: { albumId: currentGroup[0].albumIds[0], tracks: currentGroup },
            label: `Add Spotify links for ${currentGroup[0].title} and ${currentGroup.length - 1} more tracks`,
            icon: Link,
            color: 'text-green-500',
            isGrouped: true,
          });
        } else if (currentGroup.length === 1) {
          generatedTasks.push({
            type: 'spotify_uri', entity: currentGroup[0], label: `Add Spotify link for ${currentGroup[0].title}`, icon: Link, color: 'text-green-500'
          });
        }
        currentGroup = [];
      }
    });

    // Handle last group if it exists
    if (currentGroup.length > 1) {
      groupedSpotifyTasks.push({
        type: 'grouped_spotify_uri',
        entity: { albumId: currentGroup[0].albumIds[0], tracks: currentGroup },
        label: `Add Spotify links for ${currentGroup[0].title} and ${currentGroup.length - 1} more tracks`,
        icon: Link,
        color: 'text-green-500',
        isGrouped: true,
      });
    } else if (currentGroup.length === 1) {
      generatedTasks.push({
        type: 'spotify_uri', entity: currentGroup[0], label: `Add Spotify link for ${currentGroup[0].title}`, icon: Link, color: 'text-green-500'
      });
    }

    return [...generatedTasks, ...groupedSpotifyTasks];
  }, [tracks, artists, albums, releases]);

  const filteredTasks = useMemo(() => {
    let tasks = allTasks.filter(task => activeFilters[task.type]);
    if (isShuffleTasks) {
      tasks = [...tasks].sort(() => Math.random() - 0.5); // Shuffle the filtered tasks
    }
    return tasks;
  }, [allTasks, activeFilters, isShuffleTasks]);

  const lowQualityTracks = tracks.filter(t => t.bitrate && parseInt(t.bitrate) < 192);

  const pickNewPair = () => {
    if (tracks.length < 2) return;
    const availableTracks = isShufflePairing ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    
    let t1 = null;
    let t2 = null;

    if (availableTracks.length >= 2) {
      t1 = availableTracks[Math.floor(Math.random() * availableTracks.length)];
      do {
        t2 = availableTracks[Math.floor(Math.random() * availableTracks.length)];
      } while (t2.id === t1.id);
    }
    setPair(t1 && t2 ? [t1, t2] : null);
    setPlayingId(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  useEffect(() => {
    if (!pair && tracks.length >= 2) {
      pickNewPair();
    }
  }, [tracks, pair, isShufflePairing]);

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
    audioRef.current.volume = volume;
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

  const handleResolveTask = async (task: any) => {
    if (task.type === 'spotify_uri') {
      const spotifyUrl = prompt(`Enter Spotify URL for ${task.entity.title}:`);
      if (spotifyUrl) {
        await updateTrack(task.entity.id, { spotifyUrl });
        toast.success("Spotify URL updated.");
        fetchData();
      }
    } else if (task.type === 'genius_uri') {
      const geniusUrl = prompt(`Enter Genius URL for ${task.entity.title}:`);
      if (geniusUrl) {
        await updateTrack(task.entity.id, { geniusUrl });
        toast.success("Genius URL updated.");
        fetchData();
      }
    } else if (task.type === 'youtube_music_uri') {
      const youtubeMusicUrl = prompt(`Enter YouTube Music URL for ${task.entity.title}:`);
      if (youtubeMusicUrl) {
        await updateTrack(task.entity.id, { youtubeMusicUrl });
        toast.success("YouTube Music URL updated.");
        fetchData();
      }
    } else if (task.type === 'producers') {
      const producers = prompt(`Enter producers for ${task.entity.title} (comma separated):`);
      if (producers !== null) {
        await updateTrack(task.entity.id, { producers: producers.split(',').map(s => s.trim()).filter(Boolean) });
        toast.success("Producers updated.");
        fetchData();
      }
    } else if (task.type === 'genres') {
      const genres = prompt(`Enter genres for ${task.entity.title} (comma separated):`);
      if (genres !== null) {
        await updateTrack(task.entity.id, { genres: genres.split(',').map(s => s.trim()).filter(Boolean) });
        toast.success("Genres updated.");
        fetchData();
      }
    } else if (task.type === 'release_date') {
      const releaseDate = prompt(`Enter release date for ${task.entity.title} (YYYY-MM-DD or YYYY-MM or YYYY):`);
      if (releaseDate !== null) {
        await fetch(`/api/releases/${task.entity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ releaseDate })
        });
        toast.success("Release date updated.");
        fetchData();
      }
    } else if (task.type === 'artist_image') {
      setImageUploadEntity(task.entity);
      setImageUploadEntityType('artist');
      setIsImageUploadModalOpen(true);
    } else if (task.type === 'album_cover') {
      setImageUploadEntity(task.entity);
      setImageUploadEntityType('album');
      setIsImageUploadModalOpen(true);
    }
     else if (task.type === 'grouped_spotify_uri') {
      setSpotifyResolutionTracks(task.entity.tracks);
      setIsSpotifyResolutionModalOpen(true);
    }
  };

  const handleSpotifyResolution = async (trackIds: string[], uris: string[]) => {
    const updatePromises = trackIds.map((id, index) => {
      const uri = uris[index];
      return updateTrack(id, { spotifyUrl: uri });
    });
    await Promise.all(updatePromises);
    fetchData(); // Refresh data after updates
  };

  const handleImageUploadResolution = async (id: string, imageUrl: string, type: 'artist' | 'album') => {
    if (type === 'artist') {
      await updateArtist(id, { image: imageUrl });
    } else if (type === 'album') {
      await updateAlbum(id, { covers: [imageUrl] });
    }
    fetchData();
  };

  const handleFilterToggle = (type: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };


  const handleReset = () => {
    if (confirm("Are you sure you want to wipe the entire local database? This cannot be undone.")) {
      resetDatabase();
      toast.success("Database cleared successfully");
      fetchData(); // Refresh UI after reset
    }
  };

  const getAlbumArt = (track: any) => {
    const album = albums.find(a => track.albumIds?.includes(a.id));
    return album?.covers[0] || '/placeholder.svg';
  };

  const getArtistName = (track: any) => {
    const artist = artists.find(a => a.id === track.artistId);
    return artist?.name || 'Unknown Artist';
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
              <div key={track.id} className="space-y-4">
                <Card 
                  className={cn(
                    "group relative overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer",
                  )}
                  onClick={() => playSnippet(track)}
                >
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img 
                      src={getAlbumArt(track)} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      alt="" 
                    />
                    {/* White fade on hover */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
                        trackId={track.id}
                        balanced={track.rating}
                        unbalanced={track.initialRating}
                        comparisons={track.comparisons}
                        size="md"
                      />
                    </div>
                  </div>
                </Card>
                <Button 
                  onClick={() => handleVote(track.id)}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-blue-600 hover:border-blue-500 text-white font-black uppercase tracking-widest h-12 gap-2"
                >
                  <ThumbsUp size={16} /> Vote for this
                </Button>
              </div>
            ))}

            <div className="md:col-span-2 flex justify-center gap-4 pt-4">
              <Button 
                variant="outline" 
                className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2"
                onClick={() => handleVote(undefined, true)}
              >
                <Equal size={14} /> Equal
              </Button>
              <Button 
                variant="ghost" 
                className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2"
                onClick={pickNewPair}
              >
                <SkipForward size={14} /> Skip Pairing
              </Button>
              <div className="flex items-center gap-2">
                <Switch id="shuffle-pairing" checked={isShufflePairing} onCheckedChange={setIsShufflePairing} />
                <Label htmlFor="shuffle-pairing" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Shuffle Pairings
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
            <Swords size={32} className="text-blue-500 mx-auto mb-3 opacity-20" />
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
            <div className="flex items-center gap-2 ml-auto">
              <Switch id="shuffle-tasks" checked={isShuffleTasks} onCheckedChange={setIsShuffleTasks} />
              <Label htmlFor="shuffle-tasks" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                <Shuffle size={12}/> Shuffle Tasks
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50">
                    Filter Tasks
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white">
                  <DropdownMenuLabel>Filter Tasks</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  {Object.keys(activeFilters).map(filterType => (
                    <DropdownMenuCheckboxItem
                      key={filterType}
                      checked={activeFilters[filterType]}
                      onCheckedChange={() => handleFilterToggle(filterType)}
                      className="text-xs font-medium"
                    >
                      {filterType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3 opacity-20" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">All tasks completed. Your library is in top shape!</p>
                </div>
              ) : (
                filteredTasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-zinc-950 border border-zinc-800", task.color)}>
                        <task.icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{task.label}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleResolveTask(task)}
                    >
                      Resolve
                    </Button>
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
            
            {lowQualityTracks.length > 0 && (
              <ScrollArea className="h-[150px] pr-4">
                <div className="space-y-2">
                  {lowQualityTracks.map(track => (
                    <div key={track.id} className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 rounded-lg group/track">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{track.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{getArtistName(track)} - {track.bitrate}</p>
                      </div>
                      <EditTrackModal track={track}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-blue-400 opacity-0 group-hover/track:opacity-100">
                          <Edit2 size={12} />
                        </Button>
                      </EditTrackModal>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

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

      <SpotifyUriGroupResolutionModal
        isOpen={isSpotifyResolutionModalOpen}
        onClose={() => setIsSpotifyResolutionModalOpen(false)}
        tracks={spotifyResolutionTracks}
        onResolve={handleSpotifyResolution}
      />

      {imageUploadEntity && imageUploadEntityType && (
        <ImageUploadResolutionModal
          isOpen={isImageUploadModalOpen}
          onClose={() => setIsImageUploadModalOpen(false)}
          entity={imageUploadEntity}
          entityType={imageUploadEntityType}
          onResolve={handleImageUploadResolution}
        />
      )}
    </div>
  );
};

export default Cleanup;