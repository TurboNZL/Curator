import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { loadConfig } from './config.ts';
import { Store } from './db.ts';
import { migrateLegacy } from './migrate-legacy.ts';

const { values } = parseArgs({
  options: {
    db: { type: 'string' },          // legacy data/curator.db
    public: { type: 'string' },      // legacy public/ dir holding uploads/
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help || !values.db) {
  console.log(`Import a legacy Music Curator library into this server's data dir.

  node --experimental-strip-types src/cli-migrate.ts --db <old>/data/curator.db --public <old>/public

  Target data dir comes from CURATOR_DATA_DIR (default ./data). Safe to re-run: records and files are idempotent.
  Without --public no audio/images are copied and tracks will have no file.`);
  process.exit(values.help ? 0 : 1);
}
if (!existsSync(values.db)) { console.error(`No such file: ${values.db}`); process.exit(1); }
if (values.public && !existsSync(values.public)) { console.error(`No such directory: ${values.public}`); process.exit(1); }

const config = loadConfig();
const store = new Store(config.dataDir);
const report = await migrateLegacy({ legacyDb: values.db, publicDir: values.public, store, dataDir: config.dataDir });
store.close();

console.log(`Imported into ${config.dataDir}`);
console.table(report.counts);
console.log(`Files copied: ${report.files.ingested} (${(report.files.bytes / 1e6).toFixed(1)} MB)`);
if (Object.keys(report.dropped).length) { console.log('Dropped (pointed at deleted things):'); console.table(report.dropped); }
if (report.createdArtists.length) console.log('Artists created from bare names:', report.createdArtists.join(', '));
if (report.missingFiles.length) console.log(`MISSING ${report.missingFiles.length} files, e.g.:\n  ${report.missingFiles.slice(0, 5).join('\n  ')}`);
