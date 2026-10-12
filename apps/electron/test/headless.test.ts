import { describe, expect, it } from 'vitest';
import { headlessEnv, parseHeadlessArgs } from '../src/headless.ts';

describe('headless server arguments', () => {
  it('reads flags in both spellings and ignores the ones the AppImage adds', () => {
    expect(parseHeadlessArgs(['--no-sandbox', '--data-dir', '/srv/music', '--port=48000', '--host', '127.0.0.1'])).toEqual({ help: false, dataDir: '/srv/music', port: '48000', host: '127.0.0.1' });
    expect(parseHeadlessArgs(['-h']).help).toBe(true);
    expect(parseHeadlessArgs(['--data-dir'])).toEqual({ help: false });
  });
  it('flags beat the environment, which beats the default folder', () => {
    expect(headlessEnv({ help: false, dataDir: '/a' }, { CURATOR_DATA_DIR: '/b' }, '/home/u').CURATOR_DATA_DIR).toBe('/a');
    expect(headlessEnv({ help: false }, { CURATOR_DATA_DIR: '/b' }, '/home/u').CURATOR_DATA_DIR).toBe('/b');
    expect(headlessEnv({ help: false }, {}, '/home/u').CURATOR_DATA_DIR).toBe('/home/u/music-curator-data');
    expect(headlessEnv({ help: false, port: '1' }, {}, '/h').CURATOR_PORT).toBe('1');
  });
});
