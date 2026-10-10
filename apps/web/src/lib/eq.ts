/**
 * A minimal equaliser: a bass boost that does not crush the sound. A low shelf lifts everything under ~110 Hz; a matching
 * pre-gain removes the headroom the boost would use (so loud tracks do not clip), and a gentle limiter catches what is left.
 * Uses the Web Audio API on the player's <audio> element. Browsers allow `createMediaElementSource` once per element, after
 * which all its sound goes through the graph, so the graph is only built the first time a boost is asked for and is
 * bypassed (flat, no limiting) when the boost is 0 or switched off.
 */
export const EQ_SHELF_HZ = 110;
export const EQ_MAX_DB = 12;

/** Pre-gain (linear) that offsets a low-shelf boost of `db` dB: bass peaks rise by about this much in typical music. */
export const headroomFor = (db: number) => Math.pow(10, -(Math.max(0, db) * 0.55) / 20);

interface Graph { ctx: AudioContext; low: BiquadFilterNode; pre: GainNode; limiter: DynamicsCompressorNode }
let graph: Graph | null = null;

export function setBass(el: HTMLAudioElement, on: boolean, db: number) {
  const boost = on ? Math.min(Math.max(db, 0), EQ_MAX_DB) : 0;
  if (!graph) {
    if (!boost || typeof AudioContext === 'undefined') return; // never touch the sound until it is wanted
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(el);
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = EQ_SHELF_HZ;
    const pre = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.knee.value = 4; limiter.attack.value = 0.003; limiter.release.value = 0.2;
    src.connect(low); low.connect(pre); pre.connect(limiter); limiter.connect(ctx.destination);
    graph = { ctx, low, pre, limiter };
  }
  const g = graph;
  const t = g.ctx.currentTime;
  g.low.gain.setTargetAtTime(boost, t, 0.03);
  g.pre.gain.setTargetAtTime(headroomFor(boost), t, 0.03);
  g.limiter.threshold.value = boost ? -2 : 0; g.limiter.ratio.value = boost ? 12 : 1;
  if (g.ctx.state === 'suspended') void g.ctx.resume();
}

/** Call from a play event: a context created before the first user gesture starts suspended. */
export function resumeEq() { if (graph?.ctx.state === 'suspended') void graph.ctx.resume(); }
