import { describe, expect, it } from 'vitest';
import { buildActivity } from '../src/discord.ts';

const base = { title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', duration: 244, position: 30, playing: true };

describe('Discord activity', () => {
  it('is a Listening activity with a progress bar that matches the position', () => {
    const a = buildActivity(base, 1_000_000);
    expect(a.type).toBe(2);
    expect(a.details).toBe('Midnight City');
    expect(a.state).toBe('M83');
    expect(a.startTimestamp).toBe(1_000_000 - 30_000);
    expect(a.endTimestamp).toBe(1_000_000 - 30_000 + 244_000);
  });
  it('has no timestamps while paused and says so', () => {
    const a = buildActivity({ ...base, playing: false }, 1_000_000);
    expect(a.startTimestamp).toBeUndefined();
    expect(a.endTimestamp).toBeUndefined();
    expect(a.state).toBe('Paused · M83');
  });
  it('keeps every string inside Discord\'s 2..128 limits', () => {
    const a = buildActivity({ ...base, title: 'x'.repeat(300), artist: '', album: '' });
    expect((a.details as string).length).toBe(128);
    expect(a.state).toBeUndefined();
    expect(buildActivity({ ...base, title: 'A' }).details).toBe('A ');
  });
  it('omits the end time when the length is unknown', () => {
    expect(buildActivity({ ...base, duration: 0 }, 5).endTimestamp).toBeUndefined();
  });
});
