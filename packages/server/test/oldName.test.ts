import { mkdtempSync, existsSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Store, adoptOldDatabaseName } from '../src/db.ts';

describe('a data folder from before the rename', () => {
  it('keeps its library: the old database file is renamed, not replaced by an empty one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-old-'));
    const first = new Store(dir);
    first.push([{ table: 'artists', id: 'a1', updatedAt: 1, deviceId: 'd', deleted: false, data: { name: 'Kept' } as never }]);
    first.db.close();
    // put it back under the name it used to have, with a stray write-ahead log
    renameSync(join(dir, 'turbomusic.db'), join(dir, 'curator.db'));
    writeFileSync(join(dir, 'curator.db-wal'), '');
    const again = new Store(dir);
    expect(again.get('artists', 'a1')?.data).toMatchObject({ name: 'Kept' });
    expect(existsSync(join(dir, 'curator.db'))).toBe(false);
    again.db.close();
  });
  it('does nothing in a new folder, and never overwrites a current database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-new-'));
    adoptOldDatabaseName(dir);
    expect(existsSync(join(dir, 'turbomusic.db'))).toBe(false);
    writeFileSync(join(dir, 'turbomusic.db'), 'current');
    writeFileSync(join(dir, 'curator.db'), 'stale');
    adoptOldDatabaseName(dir);
    expect(existsSync(join(dir, 'curator.db'))).toBe(true);
  });
});
