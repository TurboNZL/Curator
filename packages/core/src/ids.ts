/** UUIDv7: time-ordered, globally unique, safe to mint offline on any device. */
export function newId(now: number = Date.now(), rand?: Uint8Array): string {
  const b = rand ?? globalThis.crypto.getRandomValues(new Uint8Array(10));
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
  const ts = hex(now, 12);
  const r = Array.from(b, (x) => hex(x, 2)).join('');
  const variant = ((parseInt(r.slice(4, 6), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${r.slice(0, 3)}-${variant}${r.slice(6, 8)}-${r.slice(8, 20)}`;
}
