import { useRef, useState } from 'react';
import { Download, FolderArchive, Database, Upload } from 'lucide-react';
import { api, useStore } from '../lib/store.ts';
import { localBackup, saveBlob } from '../lib/backup.ts';
import { parseBackup } from '../lib/backupFormat.ts';
import { fmtBytes } from '../lib/cn.ts';

type Mode = 'merge' | 'replace';

/**
 * Export and import, as two separate things: the database (the library: tracks, albums, votes, bios, ... no audio) and
 * the data folder (the audio and image files). The server holds both; a device without a server can still export and
 * import its own database as JSON.
 */
export function BackupCard() {
  const configured = useStore((s) => !!s.settings.token);
  const importRecords = useStore((s) => s.importRecords);
  const [mode, setMode] = useState<Mode>('merge');
  const [dbMsg, setDbMsg] = useState<string | null>(null);
  const [fileMsg, setFileMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<'db' | 'files' | null>(null);
  const dbInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const download = (what: 'database' | 'files') => { window.location.href = api().exportUrl(what); };

  async function importDb(file: File) {
    const replace = mode === 'replace';
    if (replace && !confirm('Replace the library with this backup? Anything that is not in the backup is removed, on every device that syncs.')) return;
    setBusy('db'); setDbMsg(null);
    try {
      if (/\.json$/i.test(file.name)) {
        const { records, skipped } = parseBackup(await file.text());
        const r = await importRecords(records, mode);
        setDbMsg(`Imported ${r.applied} of ${records.length} records${r.removed ? `, removed ${r.removed}` : ''}${skipped ? `, skipped ${skipped} unreadable` : ''}. ${configured ? 'It syncs to the server in the background.' : 'Kept on this device.'}`);
      } else {
        if (!configured) throw new Error('A .db file is imported by the server: connect to one in the Server section first, or use a .json backup.');
        const r = await api().importDatabase(file, mode);
        await useStore.getState().syncNow();
        setDbMsg(r.mode === 'replace' ? `The server now matches the backup (${r.written} records, ${r.removed} removed).` : `Merged: ${r.applied} of ${r.read} records were newer than what the server had.`);
      }
    } catch (e) { setDbMsg((e as Error).message); }
    finally { setBusy(null); if (dbInput.current) dbInput.current.value = ''; }
  }

  async function importFiles(file: File) {
    setBusy('files'); setFileMsg('Uploading…');
    try {
      const r = await api().importFiles(file);
      setFileMsg(`Added ${r.added} file${r.added === 1 ? '' : 's'} (${fmtBytes(r.bytes)}), ${r.existed} already there${r.corrupt ? `, ${r.corrupt} damaged and skipped` : ''}${r.ignored ? `, ${r.ignored} not recognised` : ''}.`);
    } catch (e) { setFileMsg((e as Error).message); }
    finally { setBusy(null); if (fileInput.current) fileInput.current.value = ''; }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><Database size={16} />Database</h3>
        <p className="text-sm text-muted">Your library without the audio: tracks, albums, artists, votes, bios, playlists. Small, so back it up often.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={!configured} onClick={() => download('database')} title={configured ? 'A SQLite file straight from the server' : 'Needs a server'}><Download size={15} />Download from server (.db)</button>
          <button className="btn" onClick={() => { const b = localBackup(); saveBlob(b.name, b.blob); setDbMsg(`Saved ${b.count} records from this device.`); }}><Download size={15} />Download from this device (.json)</button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="bk-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />Merge (keeps whichever edit is newer)</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="bk-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />Replace (match the backup exactly)</label>
        </div>
        <div className="flex items-center gap-2">
          <input ref={dbInput} type="file" accept=".db,.sqlite,.json" hidden onChange={(e) => e.target.files?.[0] && void importDb(e.target.files[0])} />
          <button className="btn" disabled={busy === 'db'} onClick={() => dbInput.current?.click()}><Upload size={15} />Import a database (.db or .json)</button>
        </div>
        {dbMsg && <div className="rounded-theme bg-raised p-3 text-sm" role="status">{dbMsg}</div>}
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <h3 className="flex items-center gap-2 font-medium"><FolderArchive size={16} />Data folder</h3>
        <p className="text-sm text-muted">The audio and image files the server stores, as one .tar archive that any archive tool opens. Large: it can be many gigabytes. Importing checks every file again and adds only what is missing.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={!configured} onClick={() => download('files')}><Download size={15} />Download files (.tar)</button>
          <input ref={fileInput} type="file" accept=".tar" hidden onChange={(e) => e.target.files?.[0] && void importFiles(e.target.files[0])} />
          <button className="btn" disabled={!configured || busy === 'files'} onClick={() => fileInput.current?.click()}><Upload size={15} />Import files (.tar)</button>
        </div>
        {!configured && <p className="text-xs text-muted">Files live on the server; connect to one in the Server section to export or import them.</p>}
        {fileMsg && <div className="rounded-theme bg-raised p-3 text-sm" role="status">{fileMsg}</div>}
      </div>
    </div>
  );
}
