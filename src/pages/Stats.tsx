"use client";

import { useEffect, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Play, SkipForward, Activity, History, Music } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { PlaybackHistoryModal } from '@/components/modals/PlaybackHistoryModal';

const PARTIAL_PLAY_THRESHOLD_SECONDS = 30; // Define the threshold for partial plays

const Stats = () => {
  const { tracks, playbackLogs, fetchData, currentTrackId, isPlaying, currentProgress } = useMusicStore();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const currentTrack = useMemo(() => tracks.find(t => t.id === currentTrackId), [tracks, currentTrackId]);

  const topTracksData = useMemo(() => {
    const trackPlayCounts: { [key: string]: { fullPlays: number, partialPlays: number } } = {};
    
    tracks.forEach(track => {
      trackPlayCounts[track.id] = { fullPlays: 0, partialPlays: 0 };
    });

    playbackLogs.forEach(log => {
      if (trackPlayCounts[log.trackId]) {
        if (!log.isSkip && log.duration && log.duration > PARTIAL_PLAY_THRESHOLD_SECONDS) {
          trackPlayCounts[log.trackId].fullPlays++;
        } else if (log.duration && log.duration > 0) {
          trackPlayCounts[log.trackId].partialPlays++;
        }
      }
    });

    const intermediateTracks = tracks.map(track => ({
      id: track.id,
      name: track.title,
      fullPlays: trackPlayCounts[track.id]?.fullPlays || 0,
      partialPlays: trackPlayCounts[track.id]?.partialPlays || 0,
    }));

    // Sort to get top 10 based on historical full plays for primary ranking
    const sortedAndLimitedTracks = intermediateTracks
        .sort((a, b) => b.fullPlays - a.fullPlays)
        .slice(0, 10);

    return sortedAndLimitedTracks.map(track => {
      const isCurrentlyPlayingThisTrack = isPlaying && track.id === currentTrackId;
      
      const liveFullPlay = isCurrentlyPlayingThisTrack && currentProgress > PARTIAL_PLAY_THRESHOLD_SECONDS ? 1 : 0;
      const livePartialPlay = isCurrentlyPlayingThisTrack && currentProgress > 0 && currentProgress <= PARTIAL_PLAY_THRESHOLD_SECONDS ? 1 : 0;

      return {
        name: track.name,
        id: track.id,
        historicalFullPlays: track.fullPlays,
        historicalPartialPlays: track.partialPlays,
        currentLiveFullPlay: liveFullPlay,
        currentLivePartialPlay: livePartialPlay,
      };
    });
  }, [tracks, playbackLogs, currentTrackId, isPlaying, currentProgress]);


  const totalFullPlays = useMemo(() => playbackLogs.filter(log => !log.isSkip && log.duration && log.duration > PARTIAL_PLAY_THRESHOLD_SECONDS).length + (isPlaying && currentTrackId && currentProgress > PARTIAL_PLAY_THRESHOLD_SECONDS ? 1 : 0), [playbackLogs, isPlaying, currentTrackId, currentProgress]);
  const totalPartialPlays = useMemo(() => playbackLogs.filter(log => log.isSkip || (log.duration && log.duration <= PARTIAL_PLAY_THRESHOLD_SECONDS)).length + (isPlaying && currentTrackId && currentProgress > 0 && currentProgress <= PARTIAL_PLAY_THRESHOLD_SECONDS ? 1 : 0), [playbackLogs, isPlaying, currentTrackId, currentProgress]);
  
  const totalPlays = useMemo(() => totalFullPlays + totalPartialPlays, [totalFullPlays, totalPartialPlays]);

  const totalSeconds = useMemo(() => playbackLogs.reduce((a, b) => a + (b.duration || 0), 0) + (isPlaying && currentTrackId ? currentProgress : 0), [playbackLogs, isPlaying, currentTrackId, currentProgress]);

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const skipRate = useMemo(() => {
    const loggedSkips = playbackLogs.filter(l => l.isSkip).length;
    const loggedTotalPlays = playbackLogs.length; 

    if (loggedTotalPlays === 0) return '0.0%';
    return `${((loggedSkips / loggedTotalPlays) * 100).toFixed(1)}%`;
  }, [playbackLogs]);

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playback Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Insights into your listening patterns and engagement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Play} label="Total Plays" value={totalPlays.toString()} color="text-blue-500" />
        <StatCard icon={Clock} label="Time Listened" value={formatTotalTime(totalSeconds)} color="text-emerald-500" />
        <StatCard icon={SkipForward} label="Skip Rate" value={skipRate} color="text-red-500" />
        <StatCard icon={Activity} label="Active Tracks" value={new Set(playbackLogs.map(l => l.trackId)).size.toString()} color="text-purple-500" />
      </div>

      {currentTrack && (
        <Card className="bg-blue-600/10 border-blue-500/20 p-6 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white animate-pulse">
                <Music size={24} />
              </div>
              {isPlaying && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Now Playing</p>
              <h3 className="text-lg font-black text-white uppercase truncate">{currentTrack.title}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Session</p>
            <p className="text-xl font-black text-white">LIVE</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Top Tracks (By Engagement)</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTracksData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  formatter={(value, name) => {
                    if (name === 'historicalFullPlays') return [`${value} Full Plays (Logged)`, 'Plays'];
                    if (name === 'historicalPartialPlays') return [`${value} Partial Plays (Logged)`, 'Plays'];
                    if (name === 'currentLiveFullPlay') return [`${value} Full Plays (Live)`, 'Plays'];
                    if (name === 'currentLivePartialPlay') return [`${value} Partial Plays (Live)`, 'Plays'];
                    return value;
                  }}
                />
                <Legend layout="horizontal" align="right" verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                <Bar dataKey="historicalPartialPlays" stackId="a" fill="#3b82f640" radius={[0, 0, 0, 0]} name="Partial Plays (Logged)" />
                <Bar dataKey="historicalFullPlays" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Full Plays (Logged)" />
                <Bar dataKey="currentLivePartialPlay" stackId="a" fill="#ffc10740" radius={[0, 0, 0, 0]} name="Partial Plays (Live)" />
                <Bar dataKey="currentLiveFullPlay" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} name="Full Plays (Live)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History size={16} className="text-zinc-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Recent Activity</h3>
            </div>
            <PlaybackHistoryModal />
          </div>
          <div className="space-y-4">
            {playbackLogs.slice(0, 10).map((log, i) => {
              const track = tracks.find(t => t.id === log.trackId);
              const isPartialPlay = log.isSkip || (log.duration && log.duration <= PARTIAL_PLAY_THRESHOLD_SECONDS);
              return (
                <div key={i} className="flex items-center justify-between group">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">{track?.title || 'Unknown Track'}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</p>
                  </div>
                  {isPartialPlay && <Badge variant="outline" className="text-[8px] border-zinc-700/50 text-zinc-500 bg-zinc-500/5">P</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-2">
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
  </Card>
);

export default Stats;