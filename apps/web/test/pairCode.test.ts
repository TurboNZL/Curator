import { describe, expect, it } from 'vitest';
import { decodePairCode, encodePairCode, pairFromSearch, pairLink } from '../src/lib/pairCode.ts';

describe('pairing code', () => {
  it('round-trips, also with non-ASCII and the optional tunnel token', () => {
    const p = { url: 'https://music.example.com', token: 'tok/+=é', tunnel: 'eyJhIjoiYiJ9' };
    expect(decodePairCode(encodePairCode(p))).toEqual(p);
    expect(decodePairCode(encodePairCode({ url: '', token: 'x' }))).toEqual({ url: '', token: 'x' });
  });
  it('carries a Cloudflare Access service token when there is one', () => {
    const p = { url: 'https://m.example.com', token: 't', access: { id: 'abc.access', secret: 'shh' } };
    expect(decodePairCode(encodePairCode(p))).toEqual(p);
    expect(decodePairCode(encodePairCode({ url: '', token: 't', access: { id: '', secret: 'x' } }))).toEqual({ url: '', token: 't' });
  });
  it('survives line breaks and spaces added by a messenger, and a trailing slash', () => {
    const c = encodePairCode({ url: 'http://pi:47813/', token: 'abc' });
    expect(decodePairCode(` ${c.slice(0, 12)}\n${c.slice(12)} `)).toEqual({ url: 'http://pi:47813', token: 'abc' });
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'hello', 'CUR1-', 'CUR1-###', 'CUR1-' + btoa('{"u":"ftp://x","t":"a"}'), 'CUR1-' + btoa('{"u":"http://x"}'), 'CUR1-' + btoa('{"u":"javascript:1","t":"a"}')]) expect(decodePairCode(bad)).toBeNull();
  });
  it('a link carries the code and is read back from the query', () => {
    const c = encodePairCode({ url: 'https://m.example.com', token: 't' });
    const link = pairLink('https://m.example.com/', c);
    expect(link.startsWith('https://m.example.com/?pair=')).toBe(true);
    expect(pairFromSearch(new URL(link).search)).toEqual({ url: 'https://m.example.com', token: 't' });
    expect(pairFromSearch('?x=1')).toBeNull();
  });
});
