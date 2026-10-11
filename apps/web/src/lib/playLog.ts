/**
 * One row in the listening history per time a track is played, however many ways there are to leave it. Playing happens through the
 * page's own <audio>, the Android app's player and a Spotify device, and leaving it through "ended", Next, picking another track,
 * a notification button or a transfer to another device; several of those can fire for the same play (an "ended" and a "skip" for the
 * same moment, a second press before the new track has started, an old position read while the next source loads). `claim` hands out
 * the one right to log a play, and only once it has really started.
 */
export class PlayLog {
  private cur: { id: string; started: boolean; logged: boolean } | null = null;

  /** a track was loaded to play: a new play begins (it is not logged until it is heard) */
  begin(id: string) { this.cur = { id, started: false, logged: false }; }
  /** the sound for the current play really began */
  started(id?: string) { if (this.cur && (!id || id === this.cur.id)) this.cur.started = true; }
  /** nothing is playing any more */
  clear() { this.cur = null; }
  /** true exactly once per play: when `currentId` is the track that began, it was heard, and `seconds` of it were played */
  claim(currentId: string | null, seconds: number): boolean {
    const c = this.cur;
    if (!c || !currentId || c.id !== currentId || !c.started || c.logged || seconds < 1) return false;
    c.logged = true;
    return true;
  }
}
