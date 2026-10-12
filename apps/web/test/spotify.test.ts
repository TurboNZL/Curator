import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { exportFiles, exportSpotifyFormat, historyId, historyRecords, parseSpotifyLink, spotifyTrackId, type SpotifyHistoryEntry } from '../src/lib/spotify.ts';
import { readZip } from '../src/lib/zipRead.ts';

const entry = (o: Partial<SpotifyHistoryEntry> = {}): SpotifyHistoryEntry => ({
  ts: '2026-08-07T08:45:01Z', platform: 'linux', ms_played: 250337, master_metadata_track_name: 'Get It Together', master_metadata_album_artist_name: 'Drake',
  master_metadata_album_album_name: 'More Life', spotify_track_uri: 'spotify:track:7y6c07pgjZvtHI9kuMVqk1', reason_start: 'trackdone', reason_end: 'trackdone', shuffle: true, skipped: false, ...o,
});

describe('spotify links', () => {
  it('finds ids in links and uris', () => {
    expect(spotifyTrackId('https://open.spotify.com/track/7y6c07pgjZvtHI9kuMVqk1?si=abc')).toBe('7y6c07pgjZvtHI9kuMVqk1');
    expect(spotifyTrackId('spotify:track:7y6c07pgjZvtHI9kuMVqk1')).toBe('7y6c07pgjZvtHI9kuMVqk1');
    expect(spotifyTrackId('https://open.spotify.com/album/7y6c07pgjZvtHI9kuMVqk1')).toBeNull();
    expect(spotifyTrackId(null)).toBeNull();
  });
  it('parses any kind of link', () => {
    expect(parseSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x')).toEqual({ type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' });
    expect(parseSpotifyLink('https://open.spotify.com/intl-de/track/7y6c07pgjZvtHI9kuMVqk1')).toEqual({ type: 'track', id: '7y6c07pgjZvtHI9kuMVqk1' });
    expect(parseSpotifyLink('spotify:album:7y6c07pgjZvtHI9kuMVqk1')).toEqual({ type: 'album', id: '7y6c07pgjZvtHI9kuMVqk1' });
    expect(parseSpotifyLink('https://example.com')).toBeNull();
  });
});

describe('history import', () => {
  it('makes one record per play and ignores podcasts', () => {
    const r = historyRecords([entry(), entry({ ts: '2026-08-07T08:50:00Z' }), entry({ spotify_track_uri: null, master_metadata_track_name: null, episode_name: 'Pod' })], 'dev', { now: 5 });
    expect(r.records).toHaveLength(2);
    expect(r.notMusic).toBe(1);
    expect(r.records[0].id).toBe(historyId(Date.parse('2026-08-07T08:45:01Z'), 'spotify:track:7y6c07pgjZvtHI9kuMVqk1'));
    expect(r.records[0].data).toMatchObject({ trackId: '', imported: 'spotify', name: 'Get It Together', artist: 'Drake', duration: 250.337, isSkip: false });
  });
  it('is idempotent: the same play twice is one record', () => {
    expect(historyRecords([entry(), entry()], 'd').records).toHaveLength(1);
  });
  it('applies a minimum length and detects skips', () => {
    const r = historyRecords([entry({ ms_played: 5000, ts: '2026-08-07T09:00:00Z' }), entry({ ms_played: 20000, reason_end: 'fwdbtn', skipped: null, ts: '2026-08-07T09:01:00Z' })], 'd', { minMs: 10000 });
    expect(r.tooShort).toBe(1);
    expect(r.records[0].data.isSkip).toBe(true);
  });
});

describe('export in Spotify format', () => {
  const play = { ts: Date.parse('2026-08-07T08:45:01Z'), ms: 200000, title: 'A', artist: 'B', album: 'C', uri: 'spotify:track:7y6c07pgjZvtHI9kuMVqk1', skipped: false, shuffle: null, platform: null, reasonStart: null, reasonEnd: null };
  it('writes the fields stats.fm reads and drops what has no Spotify link', () => {
    const { entries, dropped } = exportSpotifyFormat([{ ...play, ts: play.ts + 1000 }, play, { ...play, uri: null }]);
    expect(dropped).toBe(1);
    expect(entries.map((e) => e.ts)).toEqual(['2026-08-07T08:45:01Z', '2026-08-07T08:45:02Z']);
    expect(entries[0]).toMatchObject({ master_metadata_track_name: 'A', spotify_track_uri: 'spotify:track:7y6c07pgjZvtHI9kuMVqk1', ms_played: 200000, ip_addr: null, skipped: false });
  });
  it('round-trips through the importer', () => {
    const { entries } = exportSpotifyFormat([play]);
    expect(historyRecords(entries, 'd').records[0].data).toMatchObject({ name: 'A', uri: play.uri });
  });
  it('writes one set of files per year, each under the size cap, with _1, _2 for the rest', () => {
    const e = (ts: string) => ({ ts, platform: 'x', ms_played: 1, spotify_track_uri: 'spotify:track:a' }) as unknown as SpotifyHistoryEntry;
    const entries = [e('2024-05-01T00:00:00Z'), ...Array.from({ length: 30 }, (_, i) => e(`2025-01-${String(i % 28 + 1).padStart(2, '0')}T00:00:00Z`))];
    const files = exportFiles(entries, 2000);
    expect(files[0].name).toBe('Streaming_History_Audio_2024.json');
    expect(files.slice(1).map((f) => f.name)).toEqual(files.slice(1).map((_, i) => (i ? `Streaming_History_Audio_2025_${i}.json` : 'Streaming_History_Audio_2025.json')));
    expect(files.length).toBeGreaterThan(2);
    for (const f of files) { expect(f.bytes).toBeLessThanOrEqual(2000); expect(Array.isArray(JSON.parse(f.data))).toBe(true); }
    expect(files.flatMap((f) => JSON.parse(f.data) as unknown[]).length).toBe(31);
  });
});

function zip(files: { name: string; data: string; deflate?: boolean }[]): ArrayBuffer {
  const parts: Buffer[] = [], central: Buffer[] = [];
  let off = 0;
  for (const f of files) {
    const raw = Buffer.from(f.data), body = f.deflate ? deflateRawSync(raw) : raw, name = Buffer.from(f.name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(f.deflate ? 8 : 0, 8); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(f.deflate ? 8 : 0, 10); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, name, body); central.push(ch, name); off += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  const all = Buffer.concat([...parts, cd, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}

describe('zip reading', () => {
  it('reads stored and deflated json files, skipping the rest', async () => {
    const entries = await readZip(zip([{ name: 'MyData/Streaming_History_Audio_2026_1.json', data: '[1,2]', deflate: true }, { name: 'MyData/ReadMeFirst.pdf', data: 'x' }, { name: 'MyData/b.json', data: '{"a":1}' }]));
    expect(entries.map((e) => e.name)).toEqual(['MyData/Streaming_History_Audio_2026_1.json', 'MyData/b.json']);
    expect(await entries[0].text()).toBe('[1,2]');
    expect(await entries[1].text()).toBe('{"a":1}');
  });
  it('rejects something that is not a zip', async () => { await expect(readZip(new ArrayBuffer(50))).rejects.toThrow(/not a zip/); });
});

import { writeZip, crc32 } from '../src/lib/zipWrite.ts';
describe('zip writing', () => {
  it('has the standard CRC-32', () => { expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926); });
  it('round-trips through the reader', async () => {
    const z = writeZip([{ name: 'a/Streaming_History_Audio_2026_0.json', data: '[{"x":"é"}]' }, { name: 'b.json', data: '{}' }]);
    const entries = await readZip(z.buffer.slice(z.byteOffset, z.byteOffset + z.length) as ArrayBuffer);
    expect(entries.map((e) => e.name)).toEqual(['a/Streaming_History_Audio_2026_0.json', 'b.json']);
    expect(await entries[0].text()).toBe('[{"x":"é"}]');
  });
  it('is a valid zip for unzip', async () => {
    const { execFileSync } = await import('node:child_process');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'zw-')); writeFileSync(join(dir, 'x.zip'), writeZip([{ name: 'h.json', data: '[1]' }]));
    let out = ''; try { out = execFileSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.testzip(), z.read("h.json").decode())', join(dir, 'x.zip')]).toString(); } catch (e) { out = String(e); }
    expect(out.trim()).toBe('None [1]');
  });
});
