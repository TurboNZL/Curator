import type { DeviceSettings } from './settings.ts';
import { cleanBands, type EqConfig } from './eqPresets.ts';

/** The equaliser settings of this device as one value. */
export const eqConfig = (s: Pick<DeviceSettings, 'eqOn' | 'eqBass' | 'eqBands' | 'eqPreamp'>): EqConfig => ({
  on: s.eqOn, bass: Math.min(12, Math.max(0, s.eqBass)), bands: cleanBands(s.eqBands), preamp: s.eqPreamp,
});
