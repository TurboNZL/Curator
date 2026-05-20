"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Badge } from '@/components/ui/badge';
import { Play, ListMusic, Layers, Check, ArrowUpDown, Calendar, SortAsc, SortDesc, Star, User, List, Link as LinkIcon, Plus, Edit2, Trash2, Users, Disc, Music, MoreVertical, Brain, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateTrackModal } from '@/components/modals/CreateTrackModal';
import { CreateReleaseModal } from '@/components/modals/CreateReleaseModal';
import { EditAlbumModal } from '@/components/modals/EditAlbumModal';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { EditReleaseModal } from '@/components/modals/EditReleaseModal';
import { Card } from '@/components/ui/card';
import { Rating } from '@/components/ui/Rating';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { cn, trackHasAlbum } from '@/lib/utils'; // Import the helper
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RelationalBioModal } from '@/components/modals/RelationalBioModal';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal';
import { toast } from 'sonner';


const AlbumDetail = () => {
  const { id } = useParams();
  const { albums, artists, releases, tracks, setCurrentTrack, updateAlbum, activeProfile, groups, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  
  const album = albums.find(a => a.id === id);
  const artist = artists.find(a => a.id === album?.artistId);
  const albumReleases = releases.filter(r => r.albumId === id);
  const defaultImage = activeProfile.settings?.defaultAlbumImage || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  
  const albumGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === id && m.entityType === 'album' && m.showOnEntityPage)
  );
  
  const totalAlbumRelatedGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === id && m.entityType === 'album')
  ).length;

  const [showAllTracks, setShowAllTracks] = useState(false);
  const [sortConfig, setSortConfig] = useState(() => {
    const cached = sessionStorage.getItem(`album_sort_${id}`);
    return cached ? JSON.parse(cached) : { field: 'date', direction: 'desc' };
  });

  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false); // State for CreatePlaylistAddModal
  const [isRelationalBioModalOpen, setIsRelationalBioModalOpen] = useState(false); // State for RelationalBioModal
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined); // State for RelationalBioModal

  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false); // State for EditTrackModal
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<any>(null); // State to hold track being edited
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false); // State for StatsForNerdsModal


  useEffect(() => {
    sessionStorage.setItem(`album_sort_${id}`, JSON.stringify(sortConfig));
  }, [sortConfig, id]);

  const sortedReleases = useMemo(() => {
    return [...albumReleases].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.field === 'date') {
        comparison = new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime();
      } else {
        comparison = a.title.localeCompare(b.title);
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [albumReleases, sortConfig]);

  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  
  useEffect(() => {
    if (album && !selectedReleaseId) {
      setSelectedReleaseId(album.defaultReleaseId || (sortedReleases.length > 0 ? sortedReleases[0].id : null));
    }
  }, [album, sortedReleases, selectedReleaseId]);

  const currentRelease = albumReleases.find(r => r.id === selectedReleaseId);
  
  const albumTracks = useMemo(() => {
    if (showAllTracks) {
      return tracks.filter(t => trackHasAlbum(t, (id || ''))); // Use trackHasAlbum
    }
    if (currentRelease) {
      return tracks.filter(t => currentRelease.trackIds.includes(t.id));
    }
    return tracks.filter(t => trackHasAlbum(t, (id || ''))); // Use trackHasAlbum
  }, [showAllTracks, currentRelease, tracks, id]);

  const handleSetDefault = async (releaseId: string) => {
    if (!album) return;
    await updateAlbum(album.id, { defaultReleaseId: releaseId });
  };

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  if (!album) return <div className="p-8">Album not found.</div>;

  const displayCover = useMemo(() => {
    if (currentRelease?.coverImage) return currentRelease.coverImage;
    if (album.defaultReleaseId) {
        const defaultRel = albumReleases.find(r => r.id === album.defaultReleaseId);
        if (defaultRel?.coverImage) return defaultRel.coverImage;
    }
    if (album.covers && album.covers.length > 0) return album.covers[0];
    
    // If no album cover and only one release with a cover, use that
    const releasesWithCovers = albumReleases.filter(r => r.coverImage);
    if (releasesWithCovers.length === 1) {
        return releasesWithCovers[0].coverImage;
    }
    return defaultImage;
}, [currentRelease, album, albumReleases, defaultImage]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-8 items-end">
        <img 
          src={displayCover} 
          className="w-64 h-64 rounded-xl shadow-2xl border border-zinc-800 object-cover" 
          alt={album.title} 
        />
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
              {album.title}
            </h1>
            <Link 
              to={`/artists/${artist?.id}`}
              className="text-xl font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 group"
            >
              {artist?.name}
              <User size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <span className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium">
              <Users size={16} className="text-zinc-600"/> {totalAlbumRelatedGroups} Bios
            </span>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className="bg-white text-black hover:bg-zinc-200 font-bold px-8 rounded-full gap-2" 
              onClick={() => albumTracks.length > 0 && setCurrentTrack(albumTracks[0].id, { type: 'album', id: album.id, tracks: albumTracks.map(t => t.id) })}
            >
              <Play fill="currentColor" size={18} /> Play
            </Button>
            <EditAlbumModal album={album}>
              <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 rounded-full font-bold">
                Edit Project
              </Button>
            </EditAlbumModal>
            <Button variant="outline" className="border-emerald-800 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 rounded-full font-bold" onClick={() => setIsCreatePlaylistAddModalOpen(true)}>
              <Plus size={18} className="mr-2"/>Add to Playlist
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ListMusic size={14} /> {showAllTracks ? 'All Project Tracks' : 'Tracklist'}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">{albumTracks.length} Tracks</span>
              <CreateTrackModal albumId={album.id} artistId={album.artistId} />
            </div>
          </div>

          {albumTracks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-zinc-900 rounded-xl">
              <p className="text-zinc-600 text-sm">No tracks found for this release.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="hover:bg-transparent border-zinc-900">
                <TableRow className="border-zinc-900 hover:bg-transparent">
                  <TableHead className="w-10 text-zinc-600 text-[10px] font-black uppercase">#</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
                  <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {albumTracks.map((track, index) => (
                  <TrackContextMenu key={track.id} track={track}>
                    <TableRow className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group">
                      <TableCell className="text-zinc-500 font-mono text-xs">{(index + 1).toString().padStart(2, '0')}</TableCell>
                      <TableCell onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id, { type: 'album', id: album.id, tracks: albumTracks.map(t => t.id) }); }} className="cursor-pointer">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">{track.genres.join(', ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Rating
                          trackId={track.id}
                          showEditor={false}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* All actions moved to context menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800 text-white p-2">
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setCurrentTrack(track.id, { type: 'album', id: album.id, tracks: albumTracks.map(t => t.id) })}>
                                  <Play size={14} /> Play Track
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsCreatePlaylistAddModalOpen(true)}>
                                  <ListMusic size={14} /> Add to Playlist
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => {
                                  setSelectedTrackForEdit(track);
                                  setIsStatsModalOpen(true);
                                }}>
                                  <Info size={14} /> Stats for Nerds
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
                                  <Brain size={14} /> Add Memory (+1) ({track.memories || 0})
                                </DropdownMenuItem>
                                {track.memories && track.memories > 0 && (
                                  <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
                                    <Brain size={14} /> Remove Memory (-1) ({track.memories || 0})
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                {track.spotifyUrl && (
                                  <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl)}>
                                    <LinkIcon size={14} /> Copy Spotify Link
                                  </DropdownMenuItem>
                                )}
                                {track.geniusUrl && (
                                  <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.geniusUrl)}>
                                    <LinkIcon size={14} /> Copy Genius Link
                                  </DropdownMenuItem>
                                )}
                                {track.youtubeMusicUrl && (
                                  <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.youtubeMusicUrl)}>
                                    <LinkIcon size={14} /> Copy YouTube Music Link
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={(e) => { e.stopPropagation(); setSelectedTrackForEdit(track); setIsEditTrackModalOpen(true); }}>
                                  <Edit2 size={14} /> Edit Track
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer" onSelect={async () => {
                                  if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
                                    await deleteTrack(track.id);
                                    toast.success("Track deleted.");
                                  }
                                }}>
                                  <Trash2 size={14} /> Delete Track
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TrackContextMenu>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                  <Layers size={12} /> Releases
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6",
                      showAllTracks ? "text-blue-500" : "text-zinc-500"
                    )}
                    onClick={() => setShowAllTracks(!showAllTracks)}
                    title={showAllTracks ? "Show Release Tracks" : "Show All Tracks"}
                  >
                    <List size={12} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500">
                        <ArrowUpDown size={12} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sort By</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'date' })} className="text-xs font-bold gap-2">
                        <Calendar size={14} /> <span>Release Date</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'name' })} className="text-xs font-bold gap-2">
                        <SortAsc size={14} /> <span>Name</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold gap-2">
                        {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CreateReleaseModal albumId={album.id} />
                </div>
              </div>
              <div className="space-y-2">
                {sortedReleases.map(release => (
                  <div key={release.id} className="group/rel relative">
                    <button 
                      onClick={() => {
                        setSelectedReleaseId(release.id);
                        setShowAllTracks(false);
                      }}
                      className={cn(
                        "w-full text-left text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center justify-between pr-12",
                        selectedReleaseId === release.id && !showAllTracks
                          ? "bg-blue-600 text-white" 
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      )}
                    >
                      <span className="truncate">{release.title}</span>
                      {album.defaultReleaseId === release.id && <Star size={10} fill="currentColor" className="text-yellow-400" />}
                    </button>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/rel:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(release.id); }}
                        className="p-1 text-zinc-500 hover:text-yellow-400"
                        title="Set as Default"
                      >
                        <Check size={12} />
                      </button>
                      <EditReleaseModal release={release} albumId={album.id} />
                    </div>
                  </div>
                ))}
                {albumReleases.length === 0 && (
                  <p className="text-[10px] text-zinc-600 italic">No releases indexed.</p>
                )}
              </div>
            </div>
          </Card>

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Relational Bios</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => {setSelectedGroupId(undefined); setIsRelationalBioModalOpen(true);}}>
                <Plus size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {albumGroups.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No relational bios for this album to show on this page.</p>
              ) : (
                albumGroups.map(group => (
                  <Card key={group.id} className="bg-zinc-900/30 border-zinc-800 p-6 space-y-4 group/bio">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">
                        {group.name}
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{group.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {group.members?.filter(m => m.entityId !== id && m.showOnEntityPage).map((member, i) => (
                        <Link
                          key={i}
                          to={`/${member.entityType}s/${member.entityId}`}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-500 hover:text-blue-400 hover:border-blue-500/30 transition-colors flex items-center gap-1.5"
                        >
                          {member.entityType === 'artist' && <User size={10} />}
                          {member.entityType === 'album' && <Disc size={10} />}
                          {member.entityType === 'track' && <Music size={10} />}
                          {/* Releases are not an option anymore */}
                          {member.label}
                        </Link>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
      <CreatePlaylistAddModal albumToAdd={album} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <RelationalBioModal initialEntity={{ type: 'album', id: album.id, label: album.title }} open={isRelationalBioModalOpen} onOpenChange={setIsRelationalBioModalOpen} groupId={selectedGroupId} />
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
      {selectedTrackForEdit && (
        <StatsForNerdsModal
          track={selectedTrackForEdit}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </div>
  );
};

export default AlbumDetail;