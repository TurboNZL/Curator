import { describe, expect, it } from 'vitest';
import { describeError, isStillBuilding } from '../src/updateErrors.ts';

describe('update errors', () => {
  it('a release whose installers are not attached yet is not an error', () => {
    const m = 'Cannot find latest-linux.yml in the latest release artifacts (https://github.com/TurboNZL/Curator/releases/download/v2026.10.7/latest-linux.yml): HttpError: 404';
    expect(isStillBuilding(m)).toBe(true);
    expect(describeError(m).status).toBe('none');
  });
  it('anything else still is', () => {
    expect(describeError('net::ERR_INTERNET_DISCONNECTED')).toEqual({ status: 'error', message: 'net::ERR_INTERNET_DISCONNECTED' });
  });
});
