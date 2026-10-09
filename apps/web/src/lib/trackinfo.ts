import type { Library } from './library.ts';

export interface VoteLine { voteId: string; opponent: string; opponentExists: boolean; result: 'won' | 'lost' | 'equal'; timestamp: number }
export interface TrackInfo {
  wins: number; losses: number; draws: number;
  votes: VoteLine[];
  plays: number; skips: number; secondsListened: number; lastPlayed: number | null;
}

/** Everything the details dialog shows about one track: its vote record and listening history. */
export function trackInfo(lib: Library, trackId: string): TrackInfo {
  const votes: VoteLine[] = [];
  let wins = 0, losses = 0, draws = 0;
  for (const v of lib.votes) {
    if (v.trackAId !== trackId && v.trackBId !== trackId) continue;
    const otherId = v.trackAId === trackId ? v.trackBId : v.trackAId;
    const result = v.isEqual ? 'equal' : v.winnerId === trackId ? 'won' : 'lost';
    if (result === 'won') wins++; else if (result === 'lost') losses++; else draws++;
    const other = lib.trackById.get(otherId);
    votes.push({ voteId: v.id, opponent: other ? `${other.title} · ${other.artistName}` : '(deleted track)', opponentExists: !!other, result, timestamp: v.timestamp });
  }
  votes.sort((a, b) => b.timestamp - a.timestamp);
  const logs = lib.logs.filter((l) => l.trackId === trackId);
  return {
    wins, losses, draws, votes,
    plays: logs.length, skips: logs.filter((l) => l.isSkip).length,
    secondsListened: logs.reduce((s, l) => s + (l.duration ?? 0), 0),
    lastPlayed: logs.length ? Math.max(...logs.map((l) => l.timestamp)) : null,
  };
}
