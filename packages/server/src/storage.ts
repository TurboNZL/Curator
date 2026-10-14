import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync, statSync, statfsSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

/**
 * Where the server keeps what it writes. Three folders inside the data folder can live somewhere else (an external drive instead of
 * the Raspberry Pi's SD card): the library's `files`, the temporary downloads in `tmp`, and yt-dlp's `cache`. Each is a plain folder
 * or a link to the real place, so every other part of the server keeps using `<data>/files` and neither knows nor cares.
 */
export type StorageKind = 'files' | 'tmp' | 'cache';
export const KINDS: Record<StorageKind, { label: string; hint: string; content: boolean }> = {
  files: { label: 'Library files', hint: 'Audio and pictures. Big, written when you add music.', content: true },
  tmp: { label: 'Temporary files', hint: 'Downloads and uploads in progress. Written often, emptied after each.', content: false },
  cache: { label: 'yt-dlp cache', hint: 'What yt-dlp remembers between downloads. Written on every download.', content: false },
};
export const isKind = (k: unknown): k is StorageKind => typeof k === 'string' && k in KINDS;

export interface StorageEntry {
  kind: StorageKind; label: string; hint: string;
  /** `<data>/files` etc. */
  link: string;
  /** where it really is */
  path: string; moved: boolean;
  freeBytes: number; totalBytes: number;
  /** on the same disk as the operating system (the SD card on a Pi) */
  system: boolean;
}

const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

export function describeStorage(dataDir: string): StorageEntry[] {
  const root = (() => { try { return statSync('/').dev; } catch { return null; } })();
  return (Object.keys(KINDS) as StorageKind[]).map((kind) => {
    const link = join(dataDir, kind);
    mkdirSync(link, { recursive: true });
    const path = realpathSync(link);
    const s = statfsSync(path);
    return { kind, label: KINDS[kind].label, hint: KINDS[kind].hint, link, path, moved: isLink(link), freeBytes: Number(s.bavail) * s.bsize, totalBytes: Number(s.blocks) * s.bsize, system: root != null && statSync(path).dev === root };
  });
}

export class StorageError extends Error {}

/** Throws a message for the person if `target` cannot be used for `kind`. Returns the resolved path. */
export function checkTarget(dataDir: string, kind: StorageKind, target: string): string {
  if (typeof target !== 'string' || !target.trim()) throw new StorageError('Choose a folder.');
  if (!isAbsolute(target.trim())) throw new StorageError('Use a full path, starting with / (or a drive letter on Windows).');
  const to = resolve(target.trim());
  const current = realpathSync(join(dataDir, kind));
  const rel = relative(current, to);
  if (rel === '') throw new StorageError('That is where it already is.');
  if (!rel.startsWith('..') && !isAbsolute(rel)) throw new StorageError('Choose a folder outside the current one.');
  const back = relative(to, current);
  if (!back.startsWith('..') && !isAbsolute(back)) throw new StorageError('Choose a folder that does not contain the current one.');
  if (resolve(dataDir) === to) throw new StorageError('Choose a different folder from the data folder itself.');
  try {
    mkdirSync(to, { recursive: true });
    const probe = join(to, `.turbomusic-write-test-${process.pid}`);
    writeFileSync(probe, 'x'); unlinkSync(probe);
  } catch (e) { throw new StorageError(`Cannot write to ${to}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}. Is the drive mounted, and may the server's user write there?`); }
  if (readdirSync(to).length) throw new StorageError(`${to} is not empty. Choose an empty folder (a new one is created for you).`);
  return to;
}

export interface MoveProgress { phase: 'copying' | 'finishing'; copiedBytes: number; totalBytes: number; files: number }
export interface MoveOptions { onProgress?: (p: MoveProgress) => void; /** test seam: copy even when a rename would do */ forceCopy?: boolean }

function walk(dir: string, base = dir): { rel: string; size: number }[] {
  const out: { rel: string; size: number }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else if (e.isFile()) out.push({ rel: relative(base, p), size: statSync(p).size });
  }
  return out;
}

/** Copies what is in `from` that is not yet in `to` (same size). Returns the bytes and files copied. */
function copyMissing(from: string, to: string, tick: (bytes: number) => void): { bytes: number; files: number } {
  let bytes = 0, files = 0;
  for (const f of walk(from)) {
    const dest = join(to, f.rel);
    if (existsSync(dest) && statSync(dest).size === f.size) continue;
    mkdirSync(dirname(dest), { recursive: true });
    const part = `${dest}.part`;
    copyFileSync(join(from, f.rel), part);
    if (statSync(part).size !== f.size) { rmSync(part, { force: true }); throw new StorageError(`Copying ${f.rel} did not give the same size. Is the new drive full or failing? Nothing was changed.`); }
    renameSync(part, dest);
    bytes += f.size; files++; tick(f.size);
  }
  return { bytes, files };
}

/**
 * Moves one folder to `target` and leaves a link in its place. For the library files: copy everything (and verify every size), copy
 * what arrived meanwhile, swap the link, and only then delete the old folder. If anything fails before the swap the old folder is
 * untouched. On the same disk a rename does it instantly.
 */
export function moveStorage(dataDir: string, kind: StorageKind, targetIn: string, opts: MoveOptions = {}): StorageEntry[] {
  const to = checkTarget(dataDir, kind, targetIn);
  const link = join(dataDir, kind);
  const from = realpathSync(link);
  const totalBytes = KINDS[kind].content ? walk(from).reduce((n, f) => n + f.size, 0) : 0;
  let copiedBytes = 0, files = 0;
  const report = (phase: MoveProgress['phase']) => opts.onProgress?.({ phase, copiedBytes, totalBytes, files });

  const sameDisk = !opts.forceCopy && statSync(from).dev === statSync(to).dev && !isLink(link);
  let oldTree: string | null = null;
  if (sameDisk) {
    rmSync(to, { recursive: true, force: true }); // it was empty; rename wants it gone on some systems
    renameSync(from, to);
  } else {
    if (KINDS[kind].content) {
      copyMissing(from, to, (b) => { copiedBytes += b; files++; report('copying'); });
      report('finishing');
      copyMissing(from, to, (b) => { copiedBytes += b; files++; });
    }
    oldTree = from;
  }
  // swap: the old real folder steps aside, the link takes its name
  const aside = `${link}.old-${Date.now()}`;
  const wasLink = isLink(link);
  if (sameDisk) { /* `from` was renamed away already; the name is free */ }
  else if (wasLink) unlinkSync(link);
  else renameSync(link, aside);
  try { symlinkSync(to, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) {
    // put things back the way they were
    if (sameDisk) renameSync(to, from);
    else if (!wasLink) renameSync(aside, link);
    else symlinkSync(from, link, 'dir');
    throw new StorageError(`Could not link ${link} to ${to}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}. Nothing was changed.`);
  }
  if (!sameDisk) {
    const old = wasLink ? (oldTree as string) : aside;
    // anything that was uploaded in the instant between the last copy and the swap landed in the old folder: bring it over before it goes
    if (KINDS[kind].content) copyMissing(old, to, () => {});
    rmSync(old, { recursive: true, force: true });
  }
  mkdirSync(to, { recursive: true });
  report('finishing');
  return describeStorage(dataDir);
}

/** One move at a time, with progress for the page to poll. */
export class StorageMover {
  private s: { status: 'idle' | 'running' | 'done' | 'error'; kind?: StorageKind; progress?: MoveProgress; message?: string } = { status: 'idle' };
  private readonly dataDir: string;
  private readonly opts: MoveOptions;
  constructor(dataDir: string, opts: MoveOptions = {}) { this.dataDir = dataDir; this.opts = opts; }
  state() { return this.s; }
  get running() { return this.s.status === 'running'; }
  start(kind: StorageKind, target: string): void {
    if (this.running) throw new StorageError('A move is already running.');
    checkTarget(this.dataDir, kind, target); // fail on the spot with a clear message, not later in the job
    this.s = { status: 'running', kind };
    // moving can take minutes for a big library; the event loop must stay free for playback, so do it in a later tick
    setTimeout(() => {
      try { moveStorage(this.dataDir, kind, target, { ...this.opts, onProgress: (p) => { this.s = { ...this.s, progress: p }; } }); this.s = { status: 'done', kind, message: `Moved to ${resolve(target)}.` }; }
      catch (e) { this.s = { status: 'error', kind, message: (e as Error).message }; }
    }, 10);
  }
}
