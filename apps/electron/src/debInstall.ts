/**
 * Installing an update of a .deb install needs root. electron-updater does that with a blocking `pkexec --disable-internal-agent`
 * call: the whole app freezes while the password prompt is open, it fails with exit code 127 whenever the desktop session has no
 * polkit agent running (the flag forbids pkexec's own fallback), and it also runs on quit. These helpers let the app run the same
 * install asynchronously and explain each outcome.
 */

/** Single-quote a string for /bin/sh. */
export const shQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** What pkexec runs as root: dpkg, then apt fixes missing dependencies if dpkg could not finish. */
export const debInstallScript = (file: string) => `dpkg -i ${shQuote(file)} || apt-get install -f -y`;

/** What to type in a terminal when the graphical password prompt is not available. */
export const manualInstallCommand = (file: string) => `sudo apt install ${shQuote(file)}`;

export type PkexecResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

/** pkexec: 126 = the prompt was dismissed, 127 = no authorization could be obtained (usually no polkit agent), else the command's own code. */
export function describePkexec(code: number | null, stderr = ''): PkexecResult {
  if (code === 0) return { ok: true };
  if (code === 126) return { ok: false, cancelled: true, message: 'The password prompt was closed, so nothing was installed.' };
  if (code === 127 || /not authorized|no authentication agent/i.test(stderr)) {
    return { ok: false, cancelled: false, message: 'Your desktop did not show a password prompt (no polkit authentication agent is running in this session). Install it from a terminal instead:' };
  }
  const tail = stderr.trim().split('\n').slice(-3).join(' ').slice(0, 300);
  return { ok: false, cancelled: false, message: `The installer failed (exit code ${code ?? 'none'})${tail ? `: ${tail}` : ''}. You can install it from a terminal instead:` };
}
