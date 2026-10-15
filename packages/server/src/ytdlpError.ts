/**
 * What to tell the user when yt-dlp exits with an error: normally its last line. A crash of the standalone binary ends with a generic
 * "[PYI-123:ERROR] Failed to execute script", and the real reason (a Python traceback) is in the lines BEFORE it, so those are included.
 */
export function ytdlpFailure(stderr: string): string {
  const lines = stderr.trim().split('\n').map((l) => l.trimEnd()).filter(Boolean);
  const last = lines[lines.length - 1] ?? '';
  if (!/\[PYI-\d+:ERROR\]/.test(last) && !/^Traceback /.test(lines.find((l) => /^Traceback /.test(l)) ?? '')) return last;
  return lines.slice(-7).map((l) => l.trim()).join(' | ').slice(0, 700);
}
