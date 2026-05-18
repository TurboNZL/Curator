import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { tracks, votes } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const body = await readBody(event) as any;
  const { trackAId, trackBId, winnerId, isEqual } = body;

  const id = Math.random().toString(36).substring(7);
  
  // 1. Record the vote
  await db.insert(votes).values({
    id,
    trackAId,
    trackBId,
    winnerId: isEqual ? null : winnerId,
    loserId: isEqual ? null : (winnerId === trackAId ? trackBId : trackAId),
    isEqual: !!isEqual,
    timestamp: new Date(),
  });

  // 2. Update Elo scores
  const trackA = (await db.select().from(tracks).where(eq(tracks.id, trackAId)))[0];
  const trackB = (await db.select().from(tracks).where(eq(tracks.id, trackBId)))[0];

  if (!trackA || !trackB) return { error: 'Tracks not found' };

  const K = 32;
  const Ra = trackA.eloScore;
  const Rb = trackB.eloScore;

  const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
  const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

  let Sa = 0.5;
  let Sb = 0.5;

  if (!isEqual) {
    Sa = winnerId === trackAId ? 1 : 0;
    Sb = winnerId === trackBId ? 1 : 0;
  }

  const newRa = Ra + K * (Sa - Ea);
  const newRb = Rb + K * (Sb - Eb);

  await db.update(tracks).set({ 
    eloScore: newRa, 
    comparisons: sql`${tracks.comparisons} + 1` 
  }).where(eq(tracks.id, trackAId));
  
  await db.update(tracks).set({ 
    eloScore: newRb, 
    comparisons: sql`${tracks.comparisons} + 1` 
  }).where(eq(tracks.id, trackBId));

  // 3. Recalculate balanced ratings (0-10) for all tracks
  const allTracks = await db.select().from(tracks);
  if (allTracks.length > 0) {
    const eloScores = allTracks.map(t => t.eloScore);
    const minElo = Math.min(...eloScores);
    const maxElo = Math.max(...eloScores);
    const range = maxElo - minElo;

    for (const track of allTracks) {
      let balancedRating = 0;
      if (range > 0) {
        // Map Elo to 0-10
        balancedRating = ((track.eloScore - minElo) / range) * 10;
      } else {
        balancedRating = 5; // Default if all same
      }

      // If this track was one of the ones just updated, use its new Elo
      let currentElo = track.eloScore;
      if (track.id === trackAId) currentElo = newRa;
      if (track.id === trackBId) currentElo = newRb;
      
      balancedRating = range > 0 ? ((currentElo - minElo) / range) * 10 : 5;

      // Apply floor based on lowest unbalanced rating
      const minAllowed = track.initialRating !== null && track.initialRating !== undefined ? track.initialRating : 0;
      if (balancedRating < minAllowed) {
        balancedRating = minAllowed;
      }

      await db.update(tracks).set({ rating: balancedRating }).where(eq(tracks.id, track.id));
    }
  }

  return { success: true };
});
