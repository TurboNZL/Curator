import { describe, expect, it } from 'vitest';
import { parseSse } from '../src/lib/sse.ts';
import { accessHeaders } from '../src/lib/api.ts';

describe('server-sent events without EventSource', () => {
  it('splits complete events, keeps the unfinished rest, reads names and multi-line data', () => {
    const r = parseSse('event: connect\ndata: {"a":1}\n\n: keep-alive\n\nevent: x\ndata: a\ndata: b\n\nevent: part');
    expect(r.events).toEqual([{ type: 'connect', data: '{"a":1}' }, { type: 'x', data: 'a\nb' }]);
    expect(r.rest).toBe('event: part');
    expect(parseSse(r.rest + '\ndata: z\n\n').events).toEqual([{ type: 'part', data: 'z' }]);
  });
  it('handles CRLF and the default event name', () => {
    expect(parseSse('data: hi\r\n\r\n').events).toEqual([{ type: 'message', data: 'hi' }]);
  });
});

describe('Cloudflare Access service token headers', () => {
  it('both halves or nothing, trimmed', () => {
    expect(accessHeaders({ cfAccessId: ' a.access ', cfAccessSecret: ' s ' })).toEqual({ 'CF-Access-Client-Id': 'a.access', 'CF-Access-Client-Secret': 's' });
    expect(accessHeaders({ cfAccessId: 'a', cfAccessSecret: '' })).toEqual({});
    expect(accessHeaders({})).toEqual({});
  });
});
