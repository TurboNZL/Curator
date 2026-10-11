import { describe, expect, it } from 'vitest';
import { debInstallScript, describePkexec, manualInstallCommand, shQuote } from '../src/debInstall.ts';

describe('installing a .deb update', () => {
  it('quotes the path for the shell, even with quotes and spaces in it', () => {
    expect(shQuote(`/home/a b/it's.deb`)).toBe(`'/home/a b/it'\\''s.deb'`);
    expect(debInstallScript('/tmp/x y.deb')).toBe(`dpkg -i '/tmp/x y.deb' || apt-get install -f -y`);
    expect(manualInstallCommand('/tmp/x.deb')).toBe(`sudo apt install '/tmp/x.deb'`);
  });
  it('tells the pkexec outcomes apart', () => {
    expect(describePkexec(0)).toEqual({ ok: true });
    expect(describePkexec(126)).toMatchObject({ ok: false, cancelled: true });
    const r = describePkexec(127, 'Error executing command as another user: Not authorized');
    expect(r).toMatchObject({ ok: false, cancelled: false });
    expect((r as { message: string }).message).toMatch(/polkit/);
    expect((describePkexec(100, 'E: Unable to locate\ndpkg: error') as { message: string }).message).toMatch(/exit code 100.*dpkg: error/);
  });
});
