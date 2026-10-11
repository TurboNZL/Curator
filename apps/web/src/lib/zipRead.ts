/**
 * Reads the .json files out of a .zip in the browser (Spotify's data export is a zip). Only what is needed: stored and deflated
 * entries, no encryption, no zip64. `DecompressionStream` does the inflating (Chrome, Edge, Firefox, Safari 16.4+, Node 18+).
 */
export interface ZipEntry { name: string; text(): Promise<string> }

export async function readZip(buf: ArrayBuffer, accept: (name: string) => boolean = (n) => /\.json$/i.test(n)): Promise<ZipEntry[]> {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This is not a zip file.');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('The zip file is damaged.');
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!accept(name) || name.endsWith('/')) continue;
    out.push({
      name,
      async text() {
        const lh = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const raw = u8.subarray(lh, lh + csize);
        if (method === 0) return new TextDecoder().decode(raw);
        if (method !== 8) throw new Error(`${name}: unsupported zip compression`);
        const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new TextDecoder().decode(await new Response(stream).arrayBuffer());
      },
    });
  }
  return out;
}
