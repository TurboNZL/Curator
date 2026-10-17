import { describe, expect, it } from 'vitest';
import { explainTermuxFailure } from '../src/lib/termux.ts';

describe('explainTermuxFailure', () => {
  it('turns a SecurityException into the permission step', () => expect(explainTermuxFailure({ err: 'java.lang.SecurityException: Requires permission com.termux.permission.RUN_COMMAND' })).toMatch(/Allow/));
  it('turns the allow-external-apps refusal into the one-time step', () => expect(explainTermuxFailure({ err: 'RUN_COMMAND not allowed: set allow-external-apps' })).toMatch(/one-time/));
});
