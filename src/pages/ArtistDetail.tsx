import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Music2, Calendar, Play, Star, TrendingUp, Link as LinkIcon, User, Disc, Music, Layers, Edit2, Trash2, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateAlbumModal } from '@/components/modals/CreateAlbumModal';
import { EditArtistModal } from '@/components/modals/EditArtistModal';
import { Rating } from '@/components/ui/Rating';
import { RelationalBioModal } from '@/components/modals/RelationalBioModal';
import { useState, useMemo } from 'react'; // Import useState
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { cn } from '@/lib/utils';


const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { artists, albums, tracks, setCurrentTrack, groups, activeProfile } = useMusicStore();

  const artist = artists.find(a => a.id === id);
  const defaultImage = activeProfile.settings?.defaultArtistImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop';
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  
  const artistAlbums = albums.filter(al => al.artistId === id);
  
  // Sort by rating (star rating) then by eloScore (ranking)
  const artistTracks = useMemo(() => {
    // Function to get effective rating for sorting, prioritizing balanced then initial
    const getEffectiveRating = (track: any) => {
        if (track.rating !== undefined && track.rating !== null && track.comparisons >= 3) {
            return track.rating;
        }
        if (track.initialRating !== undefined && track.initialRating !== null) {
            return track.initialRating;
        }
        return -1; // Treat truly unrated or 0.0 as lowest for sorting
    };

    // Get all tracks, even those with only initialRating
    const allArtistTracks = tracks.filter(t => t.artistId === id);

    const sorted = [...allArtistTracks].sort((a, b) => {
        const ratingA = getEffectiveRating(a);
        const ratingB = getEffectiveRating(b);

        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.eloScore ?? 0) - (a.eloScore ?? 0);
    });

    // Special handling for 10-star tracks to group them and then sort by elo
    const tenStarTracks = sorted.filter(t => (getEffectiveRating(t) >= 9.9999 && t.comparisons > 0)); // Only include 10/10 with comparisons
    const otherTracks = sorted.filter(t => !(getEffectiveRating(t) >= 9.9999 && t.comparisons > 0));

    tenStarTracks.sort((a, b) => (b.eloScore ?? 0) - (a.eloScore ?? 0));

    return [...tenStarTracks, ...otherTracks];
  }, [tracks, id]);

  const avgArtistRating = useMemo(() => {
    const ratedTracks = artistTracks.filter(t => {
        const effectiveRating = (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null)
            ? t.rating
            : (t.initialRating !== undefined && t.initialRating !== null)
                ? t.initialRating
                : null;
        return effectiveRating !== null && effectiveRating > 0; // Only count positive ratings
    });
    if (ratedTracks.length === 0) return 'N/A';
    const totalRating = ratedTracks.reduce((sum, t) => {
        const effectiveRating = (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null)
            ? t.rating
            : (t.initialRating !== undefined && t.initialRating !== null)
                ? t.initialRating
                : 0;
        return sum + effectiveRating;
    }, 0);
    return (totalRating / ratedTracks.length).toFixed(1);
  }, [artistTracks]);


  const artistGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === id && m.entityType === 'artist' && m.showOnEntityPage)
  );
  
  const totalArtistRelatedGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === id && m.entityType === 'artist')
  ).length;

  const [isRelationalBioModalOpen, setIsRelationalBioModalOpen] = useState(false); // Add state for modal
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined); // State for RelationalBioModal

  if (!artist) return <div className="p-8">Artist not found.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative h-80 -mt-8 -mx-8 overflow-hidden">
        <img src={artist.image || defaultImage} className="w-full h-full object-cover blur-sm opacity-30 scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-12 flex items-end gap-8">
          <img src={artist.image || defaultImage} className="w-48 h-48 object-cover rounded-2xl shadow-2xl border-4 border-zinc-900" alt={artist.name} />
          <div className="flex-1 pb-4">
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">{artist.name}</h1>
            <div className="flex items-center gap-6 mt-4 text-zinc-400 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Music2 size={16} className="text-zinc-600"/> {artistAlbums.length} Albums</span>
              <span className="flex items-center gap-1.5"><Users size={16} className="text-zinc-600"/> {totalArtistRelatedGroups} Bios</span>
              <span className="flex items-center gap-1.5"><Star size={16} className="text-zinc-600"/> Avg. Rating: {avgArtistRating}</span>
              <div className="flex gap-2 ml-4">
                <EditArtistModal artist={artist} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Discography</h2>
              <CreateAlbumModal />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {artistAlbums.map(album => (
                <Card key={album.id} className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all cursor-pointer group" onClick={() => navigate(`/albums/${album.id}`)}>
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                    <img src={album.covers[0] || defaultAlbumImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={album.title} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" className="rounded-full bg-blue-600 hover:bg-blue-500 text-white w-10 h-10">
                        <Play fill="currentColor" size={18}/>
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{album.title}</h3>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Top Rated Tracks</h2>
            </div>
            <div className="space-y-2">
              {artistTracks.slice(0, 10).map((track, i) => (
                <TrackContextMenu key={track.id} track={track}>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors cursor-pointer group" onClick={() => setCurrentTrack(track.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-600">{i + 1}</span>
                      <span className="text-xs font-bold text-white truncate group-hover:text-blue-400">{track.title}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Rating
                        trackId={track.id}
                        showEditor={false} // Always false for artist top tracks
                      />
                    </div>
                  </div>
                </TrackContextMenu>
              ))}
            </div>
          </section>

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
              {artistGroups.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No relational bios for this artist to show on this page.</p>
              ) : (
                artistGroups.map(group => (
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
      <RelationalBioModal initialEntity={{ type: 'artist', id: artist.id, label: artist.name }} open={isRelationalBioModalOpen} onOpenChange={setIsRelationalBioModalOpen} groupId={selectedGroupId} />
    </div>
  );
};

export default ArtistDetail;