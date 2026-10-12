import { describe, expect, it } from 'vitest';
import { makeRule, withAccess } from '../src/accessHeaders.ts';

describe('Cloudflare Access headers', () => {
  it('needs an http(s) address and both halves of the token', () => {
    expect(makeRule('https://music.example.com/x', ' id ', 's')).toEqual({ origin: 'https://music.example.com', id: 'id', secret: 's' });
    expect(makeRule('https://a.b', '', 's')).toBeNull();
    expect(makeRule('ftp://a.b', 'i', 's')).toBeNull();
    expect(makeRule('not a url', 'i', 's')).toBeNull();
    expect(makeRule(undefined, 'i', 's')).toBeNull();
  });
  it('adds the headers only for the configured origin', () => {
    const rule = makeRule('https://music.example.com', 'i', 's');
    expect(withAccess(rule, 'https://music.example.com/api/files/abc', { Range: 'bytes=0-' })).toEqual({ Range: 'bytes=0-', 'CF-Access-Client-Id': 'i', 'CF-Access-Client-Secret': 's' });
    expect(withAccess(rule, 'https://other.example.com/x', { A: '1' })).toEqual({ A: '1' });
    expect(withAccess(null, 'https://music.example.com/', { A: '1' })).toEqual({ A: '1' });
  });
  it('does not overwrite headers the page set itself', () => {
    const rule = makeRule('https://m.example', 'i', 's');
    expect(withAccess(rule, 'https://m.example/a', { 'cf-access-client-id': 'own', 'cf-access-client-secret': 'own2' })).toEqual({ 'cf-access-client-id': 'own', 'cf-access-client-secret': 'own2' });
  });
});
