"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'; 
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, FileWarning, Database, Swords, Play, Pause, SkipForward, Equal, Image as ImageIcon, Music, Calendar, User, Tag, ThumbsUp, Link, Youtube, Shuffle, FileText, Users } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils';
import { Rating } from '@/components/ui/Rating';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Switch } from '@/components/ui/switch';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { LowQualityTracksModal } from '@/components/modals/LowQualityTracksModal';
import { TrackRightClickMenu } from '@/components/ui/TrackRightClickMenu';
import { useLocation } from 'react-router-dom';
import { SpotifyUriGroupResolutionModal } from '@/components/modals/SpotifyUriGroupResolutionModal';
import { GeniusLinkResolutionModal } from '@/components/modals/GeniusLinkResolutionModal';
import { YoutubeMusicLinkResolutionModal } from '@/components/modals/YoutubeMusicLinkResolutionModal';
import { ReleaseDateResolutionModal } from '@/components/modals/ReleaseDateResolutionModal';
import { AlbumCreditsResolutionModal } from '@/components/modals/AlbumCreditsResolutionModal';
import { Track, Album, Release, Credit } from '../server/types/music';


interface ImageUploadResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: any;
  onResolve: (id: string, imageUrl: string, type: 'artist' | 'album') => Promise<void>;
  entityType: 'artist' | 'album';
}

const ImageUploadResolutionModal: React.FC<ImageUploadResolutionModalProps> = ({ isOpen, onClose, entity, onResolve, entityType }) => {
  const [imageUrl, setImageUrl] = useState(entity?.image || entity?.primaryCover || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(entity?.image || entity?.primaryCover || '');
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
  const { tracks, albums, artists, releases, vote, volume, updateTrack, updateAlbum, updateArtist, fetchData, activeProfile, clearUnlinkedFiles, clearUnusedCategoriesAndGenres } = useMusicStore();
  
  const [pair, setPair] = useState<[any, any] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isShufflePairing, setIsShufflePairing] = useState(false);
  const [isShuffleTasks, setIsShuffleTasks] = useState(false);

  // States for Modals
  const [isSpotifyResolutionModalOpen, setIsSpotifyResolutionModalOpen] = useState(false);
  const [spotifyResolutionTracks, setSpotifyResolutionTracks] = useState<Track[]>([]);
  const [spotifyResolutionAlbum, setSpotifyResolutionAlbum] = useState<{
    albumId: string;
    albumTitle: string;
    releaseId?: string;
    releaseTitle?: string;
  } | null>(null);

  const [isGeniusResolutionModalOpen, setIsGeniusResolutionModalOpen] = useState(false);
  const [selectedTrackForGenius, setSelectedTrackForGenius] = useState<Track | null>(null);

  const [isYoutubeMusicResolutionModalOpen, setIsYoutubeMusicResolutionModalOpen] = useState(false);
  const [selectedTrackForYoutubeMusic, setSelectedTrackForYoutubeMusic] = useState<Track | null>(null);

  const [isReleaseDateResolutionModalOpen, setIsReleaseDateResolutionModalOpen] = useState(false);
  const [selectedReleaseForDate, setSelectedReleaseForDate] = useState<Release | null>(null);

  const [isAlbumCreditsResolutionModalOpen, setIsAlbumCreditsResolutionModalOpen] = useState(false);
  const [selectedAlbumForCredits, setSelectedAlbumForCredits] = useState<Album | null>(null);

  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [imageUploadEntity, setImageUploadEntity] = useState<any>(null);
  const [imageUploadEntityType, setImageUploadEntityType] = useState<'artist' | 'album' | null>(null);
  const [isLowQualityOpen, setIsLowQualityOpen] = useState(false);

  // Updated filters based on new structure
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    artist_image: true,
    album_cover: true,
    album_metadata: true, // Combines album credits and genres
    thumbnail: true, // Added for future use, just in case
    release_date: true,
    track_spotify_link: true, // Specific Spotify link
    track_genius_link: true, // Specific Genius link
    track_youtube_music_link: true, // Specific YouTube Music link
    album_spotify_links: true, // Grouped Spotify links
    album_genius_links: true, // Grouped Genius links
    album_youtube_music_links: true, // Grouped YouTube Music links
    track_metadata: true, // Any missing track genres or credits
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const location = useLocation();

  const tasksPerPage = 20;
  const [visibleTaskCount, setVisibleTaskCount] = useState(tasksPerPage);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleEnded = () => {
      setPlayingId(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      if (audio.src && audio.paused) {
        audio.removeAttribute('src'); 
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname]);


  const getAlbumArt = (track: any) => {
    const album = albums.find(a => trackHasAlbum(track, a.id));
    return getAlbumDisplayCover(album, releases, activeProfile.settings?.defaultAlbumImage || '/placeholder.svg');
  };

  const allTasks = useMemo(() => {
    const generatedTasks: any[] = [];
    const processedTrackIdsForGroupedLinks = new Set<string>(); 

    // Artist Image
    artists.filter(a => !a.image).forEach(a => {
      generatedTasks.push({ type: 'artist_image', entity: a, label: `Add image for ${a.name}`, icon: User, color: 'text-purple-500' });
    });

    // Album Cover
    albums.filter(al => {
        const hasPrimaryCover = !!al.primaryCover;
        if (hasPrimaryCover) return false;
        const albumHasReleaseCover = releases.some(r => r.albumId === al.id && !!r.coverImage);
        return !albumHasReleaseCover;
    }).forEach(al => {
      generatedTasks.push({ type: 'album_cover', entity: al, label: `Add cover for ${al.title}`, icon: ImageIcon, color: 'text-blue-500' });
    });

    // Album Metadata (Credits & Genres)
    albums.filter(al => al.artistCredits.length === 0 || al.genres.length === 0).forEach(al => {
      let missingItems = [];
      if (al.artistCredits.length === 0) missingItems.push("artist roles");
      if (al.genres.length === 0) missingItems.push("genres");
      
      if (missingItems.length > 0) {
        generatedTasks.push({ 
          type: 'album_metadata', 
          entity: al, 
          label: `Complete metadata for album ${al.title} (missing: ${missingItems.join(', ')})`, 
          icon: FileText, 
          color: 'text-indigo-500' 
        });
      }
    });

    // Release Date
    releases.filter(r => !r.releaseDate).forEach(r => {
      const album = albums.find(al => al.id === r.albumId);
      generatedTasks.push({ type: 'release_date', entity: r, label: `Add date for release ${r.title} (${album?.title || 'Unknown Album'})`, icon: Calendar, color: 'text-orange-500' });
    });

    // Grouped Track Links (Album-level)
    albums.forEach(album => {
        let relevantRelease = album.defaultReleaseId ? releases.find(r => r.id === album.defaultReleaseId) : null;
        if (!relevantRelease && releases.some(r => r.albumId === album.id)) {
            relevantRelease = releases.find(r => r.albumId === album.id);
        }

        let albumTrackIdsInOrder: string[] = [];
        if (relevantRelease) {
            albumTrackIdsInOrder = relevantRelease.trackIds;
        } else {
            const associatedAlbumTracks = tracks.filter(t => t.albumIds.some(aid => aid.albumId === album.id));
            albumTrackIdsInOrder = [...associatedAlbumTracks]
              .sort((a, b) => {
                const orderA = a.albumIds.find(aid => aid.albumId === album.id)?.order ?? 999;
                const orderB = b.albumIds.find(aid => aid.albumId === album.id)?.order ?? 999;
                return orderA - orderB;
              })
              .map(t => t.id);
        }

        // Filter tracks that are missing links and haven't been processed yet by other album-level tasks
        const tracksInAlbumMissingSpotify = albumTrackIdsInOrder
            .map(trackId => tracks.find(t => t.id === trackId))
            .filter((t): t is Track => t !== undefined && !t.spotifyUrl && !processedTrackIdsForGroupedLinks.has(t.id));
        
        const tracksInAlbumMissingGenius = albumTrackIdsInOrder
            .map(trackId => tracks.find(t => t.id === trackId))
            .filter((t): t is Track => t !== undefined && !t.geniusUrl && !processedTrackIdsForGroupedLinks.has(t.id));

        const tracksInAlbumMissingYoutube = albumTrackIdsInOrder
            .map(trackId => tracks.find(t => t.id === trackId))
            .filter((t): t is Track => t !== undefined && !t.youtubeMusicUrl && !processedTrackIdsForGroupedLinks.has(t.id));


        if (tracksInAlbumMissingSpotify.length > 0) {
            tracksInAlbumMissingSpotify.forEach(t => processedTrackIdsForGroupedLinks.add(t.id));
            generatedTasks.push({
                type: 'album_spotify_links',
                entity: { 
                    albumId: album.id, 
                    albumTitle: album.title,
                    releaseId: relevantRelease?.id,
                    releaseTitle: relevantRelease?.title,
                    tracks: tracksInAlbumMissingSpotify 
                },
                label: `Add Spotify URIs for ${album.title} (${tracksInAlbumMissingSpotify.length} tracks)`,
                icon: Link,
                color: 'text-green-500',
                isGrouped: true,
            });
        }
        if (tracksInAlbumMissingGenius.length > 0) {
            tracksInAlbumMissingGenius.forEach(t => processedTrackIdsForGroupedLinks.add(t.id));
            generatedTasks.push({
                type: 'album_genius_links',
                entity: { 
                    albumId: album.id, 
                    albumTitle: album.title,
                    releaseId: relevantRelease?.id,
                    releaseTitle: relevantRelease?.title,
                    tracks: tracksInAlbumMissingGenius 
                },
                label: `Add Genius links for ${album.title} (${tracksInAlbumMissingGenius.length} tracks)`,
                icon: Link,
                color: 'text-yellow-500',
                isGrouped: true,
            });
        }
        if (tracksInAlbumMissingYoutube.length > 0) {
            tracksInAlbumMissingYoutube.forEach(t => processedTrackIdsForGroupedLinks.add(t.id));
            generatedTasks.push({
                type: 'album_youtube_music_links',
                entity: { 
                    albumId: album.id, 
                    albumTitle: album.title,
                    releaseId: relevantRelease?.id,
                    releaseTitle: relevantRelease?.title,
                    tracks: tracksInAlbumMissingYoutube 
                },
                label: `Add YouTube Music links for ${album.title} (${tracksInAlbumMissingYoutube.length} tracks)`,
                icon: Link,
                color: 'text-red-500',
                isGrouped: true,
            });
        }
    });

    // Individual Track Links (not part of an album or already covered by album-level task)
    tracks.filter(t => !processedTrackIdsForGroupedLinks.has(t.id)).forEach(t => {
        if (!t.spotifyUrl) {
            generatedTasks.push({ type: 'track_spotify_link', entity: t, label: `Add Spotify URI for ${t.title}`, icon: Link, color: 'text-green-500', isGrouped: false });
        }
        if (!t.geniusUrl) {
            generatedTasks.push({ type: 'track_genius_link', entity: t, label: `Add Genius link for ${t.title}`, icon: Link, color: 'text-yellow-500', isGrouped: false });
        }
        if (!t.youtubeMusicUrl) {
            generatedTasks.push({ type: 'track_youtube_music_link', entity: t, label: `Add YouTube Music link for ${t.title}`, icon: Youtube, color: 'text-red-500', isGrouped: false });
        }
    });

    // Track Metadata (conditional based on syncWithAlbumCredits)
    tracks.filter(t => {
      const associatedAlbum = albums.find(al => t.albumIds.some(aId => aId.albumId === al.id));
      const shouldCheckIndividualMetadata = !associatedAlbum || !t.syncWithAlbumCredits;
      
      // Only generate if not syncing with album OR no album, AND metadata is missing
      return shouldCheckIndividualMetadata && (t.genres.length === 0 || t.artistCredits.length === 0);
    }).forEach(t => {
      let missingItems = [];
      if (t.genres.length === 0) missingItems.push("genres");
      if (t.artistCredits.length === 0) missingItems.push("artist credits");
      
      if (missingItems.length > 0) {
        generatedTasks.push({ 
          type: 'track_metadata', 
          entity: t, 
          label: `Complete metadata for track ${t.title} (missing: ${missingItems.join(', ')})`, 
          icon: Music, 
          color: 'text-purple-400' 
        });
      }
    });

    return generatedTasks;
  }, [tracks, artists, albums, releases]);


  const filteredAndSortedTasks = useMemo(() => {
    let tasks = allTasks.filter(task => activeFilters[task.type]);

    if (isShuffleTasks) {
      tasks = [...tasks].sort(() => Math.random() - 0.5);
    }
    return tasks;
  }, [allTasks, activeFilters, isShuffleTasks]);

  const loadMoreTasks = () => {
    setVisibleTaskCount(prev => prev + tasksPerPage);
  };

  const lowQualityTracks = tracks.filter(t => t.bitrate && parseInt(t.bitrate) < 192);

  const pickNewPair = useCallback(() => {
    if (tracks.length < 2) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    setPlayingId(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

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
  }, [tracks, isShufflePairing]);

  useEffect(() => {
    if (!pair && tracks.length >= 2) {
      pickNewPair();
    }
  }, [tracks, pair, pickNewPair]);

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
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
      }
      pickNewPair();
    } catch (error) {
      toast.error("Failed to record vote");
    }
  };

  const playSnippet = (track: any) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    if (playingId === track.id) {
      audioRef.current.pause();
      setPlayingId(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (!track.localFilePath) {
      toast.error("No local file for this track");
      return;
    }

    if (audioRef.current.src) {
      audioRef.current.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    
    setPlayingId(track.id);
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
    // Album-level link resolution
    if (task.type === 'album_spotify_links') {
        setSpotifyResolutionTracks(task.entity.tracks);
        setSpotifyResolutionAlbum({
            albumId: task.entity.albumId,
            albumTitle: task.entity.albumTitle,
            releaseId: task.entity.releaseId,
            releaseTitle: task.entity.releaseTitle,
        });
        setIsSpotifyResolutionModalOpen(true);
    } else if (task.type === 'album_genius_links') {
        // For album-level grouped Genius links, we'll open EditTrackModal for each track.
        // It might be better to have a similar group resolution modal for Genius/YouTube in the future.
        // For now, we'll default to resolving the first track or opening a generic edit modal.
        if (task.entity.tracks.length > 0) {
            setSelectedTrackForGenius(task.entity.tracks[0]);
            setIsGeniusResolutionModalOpen(true);
        } else {
            toast.info("No tracks found for this grouped Genius link task.");
        }
    } else if (task.type === 'album_youtube_music_links') {
        if (task.entity.tracks.length > 0) {
            setSelectedTrackForYoutubeMusic(task.entity.tracks[0]);
            setIsYoutubeMusicResolutionModalOpen(true);
        } else {
            toast.info("No tracks found for this grouped YouTube Music link task.");
        }
    } 
    // Individual track link resolution
    else if (task.type === 'track_spotify_link') {
        setSelectedTrackForEdit(task.entity); // Open EditTrackModal which has all links
        setIsEditTrackModalOpen(true);
    } else if (task.type === 'track_genius_link') {
        setSelectedTrackForGenius(task.entity);
        setIsGeniusResolutionModalOpen(true);
    } else if (task.type === 'track_youtube_music_link') {
        setSelectedTrackForYoutubeMusic(task.entity);
        setIsYoutubeMusicResolutionModalOpen(true);
    }
    // Other task types
    else if (task.type === 'album_metadata') {
      setSelectedAlbumForCredits(task.entity);
      setIsAlbumCreditsResolutionModalOpen(true);
    } else if (task.type === 'release_date') {
      setSelectedReleaseForDate(task.entity);
      setIsReleaseDateResolutionModalOpen(true);
    } else if (task.type === 'artist_image') {
      setImageUploadEntity(task.entity);
      setImageUploadEntityType('artist');
      setIsImageUploadModalOpen(true);
    } else if (task.type === 'album_cover') {
      setImageUploadEntity(task.entity);
      setImageUploadEntityType('album');
      setIsImageUploadModalOpen(true);
    } else if (task.type === 'track_metadata') { 
      setSelectedTrackForEdit(task.entity);
      setIsEditTrackModalOpen(true);
    }
  };

  const handleSpotifyResolution = async (trackIds: string[], uris: string[]) => {
    const updatePromises = trackIds.map((id, index) => {
      const uri = uris[index];
      const currentTrack = tracks.find(t => t.id === id);
      if (uri && currentTrack?.spotifyUrl !== uri) {
        return updateTrack(id, { spotifyUrl: uri });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
    fetchData();
  };

  const handleGeniusResolution = async (trackId: string, geniusUrl: string) => {
    await updateTrack(trackId, { geniusUrl });
    fetchData();
  };

  const handleYoutubeMusicResolution = async (trackId: string, youtubeMusicUrl: string) => {
    await updateTrack(trackId, { youtubeMusicUrl });
    fetchData();
  };

  const handleAlbumCreditsResolution = async (albumId: string, artistCredits: Credit[]) => {
    const albumToUpdate = albums.find(a => a.id === albumId);
    await updateAlbum(albumId, { artistCredits, genres: albumToUpdate?.genres || [] }); // Keep existing genres for now
    fetchData();
  };

  const handleReleaseDateResolution = async (releaseId: string, releaseDate: string) => {
    await fetch(`/api/releases/${releaseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseDate })
    });
    fetchData();
  };

  const handleImageUploadResolution = async (id: string, imageUrl: string, type: 'artist' | 'album') => {
    if (type === 'artist') {
      await updateArtist(id, { image: imageUrl });
    } else if (type === 'album') {
      await updateAlbum(id, { primaryCover: imageUrl });
    }
    fetchData();
  };

  const handleFilterToggle = (type: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false); // State for EditTrackModal
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Library Cleanup</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Maintain your catalog integrity and optimize storage.</p>
        </div>
        <div className="flex gap-4">
        </div>
      </div>

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-900 flex items-center justify-center text-zinc-500 font-black italic text-xl shadow-2xl">
                  VS
                </div>
              </div>

              {pair.map((track, idx) => (
                <div key={track.id} className="space-y-4 min-w-0">
                  <Card 
                    className={cn(
                      "group relative overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer",
                    )}
                    onClick={() => playSnippet(track)}
                  >
                    <div className="aspect-[16/9] relative overflow-hidden">
                      <img 
                        src={getAlbumArt(track)} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0" 
                        alt="" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl">
                          {playingId === track.id ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                        <h3 className="text-xl font-black text-white uppercase truncate leading-tight">{track.title}</h3>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-tight mt-1">
                          {albums.find(a => track.albumIds?.some((aId:any) => aId.albumId === a.id))?.title || 'Unknown Album'}
                        </p>
                        <div className="mt-2 flex">
                          <Rating track={track} size="md" isCleanupContext={true} showEditor={false}/>
                        </div>
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
            </div>

            <div className="flex justify-center gap-4 pt-4">
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
            </div>
          </>
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
                      onSelect={(e) => e.preventDefault()} // Keep dropdown open
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
              {filteredAndSortedTasks.slice(0, visibleTaskCount).length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3 opacity-20" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">All tasks completed. Your library is in top shape!</p>
                </div>
              ) : (
                filteredAndSortedTasks.slice(0, visibleTaskCount).map((task, i) => (
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
              {visibleTaskCount < filteredAndSortedTasks.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadMoreTasks}
                    className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest h-9 px-6"
                  >
                    Load More Tasks
                  </Button>
                </div>
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
            
            <Button variant="outline" className="w-full border-zinc-800 text-[10px] font-black uppercase h-9 tracking-widest group-hover:bg-yellow-500 group-hover:text-black transition-colors" onClick={() => setIsLowQualityOpen(true)}>Review Files</Button>
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

      {spotifyResolutionAlbum && (
        <SpotifyUriGroupResolutionModal
          isOpen={isSpotifyResolutionModalOpen}
          onClose={() => setIsSpotifyResolutionModalOpen(false)}
          tracks={spotifyResolutionTracks}
          albumDetails={spotifyResolutionAlbum}
          onResolve={handleSpotifyResolution}
        />
      )}

      {selectedTrackForGenius && (
        <GeniusLinkResolutionModal
          isOpen={isGeniusResolutionModalOpen}
          onClose={() => setIsGeniusResolutionModalOpen(false)}
          track={selectedTrackForGenius}
          onResolve={handleGeniusResolution}
        />
      )}

      {selectedTrackForYoutubeMusic && (
        <YoutubeMusicLinkResolutionModal
          isOpen={isYoutubeMusicResolutionModalOpen}
          onClose={() => setIsYoutubeMusicResolutionModalOpen(false)}
          track={selectedTrackForYoutubeMusic}
          onResolve={handleYoutubeMusicResolution}
        />
      )}

      {selectedReleaseForDate && (
        <ReleaseDateResolutionModal
          isOpen={isReleaseDateResolutionModalOpen}
          onClose={() => setIsReleaseDateResolutionModalOpen(false)}
          release={selectedReleaseForDate}
          onResolve={handleReleaseDateResolution}
        />
      )}

      {selectedAlbumForCredits && (
        <AlbumCreditsResolutionModal
          isOpen={isAlbumCreditsResolutionModalOpen}
          onClose={() => setIsAlbumCreditsResolutionModalOpen(false)}
          album={selectedAlbumForCredits} 
          onResolve={handleAlbumCreditsResolution}
        />
      )}
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}

      {imageUploadEntity && imageUploadEntityType && (
        <ImageUploadResolutionModal
          isOpen={isImageUploadModalOpen}
          onClose={() => setIsImageUploadModalOpen(false)}
          entity={imageUploadEntity}
          entityType={imageUploadEntityType}
          onResolve={handleImageUploadResolution}
        />
      )}

      <LowQualityTracksModal open={isLowQualityOpen} onOpenChange={setIsLowQualityOpen} />
    </div>
  );
};

export default Cleanup;