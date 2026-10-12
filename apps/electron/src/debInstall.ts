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

/** What a terminal window runs when there is no graphical password prompt: the same install with sudo, then a pause so the output can be read. */
export const terminalInstallScript = (file: string) =>
  `echo 'Installing the Music Curator update. Your password is asked by sudo below.'; echo; ` +
  `sudo sh -c ${shQuote(debInstallScript(file))}; code=$?; echo; ` +
  `if [ $code -eq 0 ]; then echo 'Done. Music Curator will restart.'; else echo "The install failed (code $code)."; fi; ` +
  `printf 'Press Enter to close this window… '; read _; exit $code`;

/** Terminal emulators to try, in order, each with the arguments that run a shell script and keep the process alive until the window closes. */
export const TERMINALS: { bin: string; args: (script: string) => string[] }[] = [
  { bin: 'x-terminal-emulator', args: (s) => ['-e', 'sh', '-c', s] },
  { bin: 'gnome-terminal', args: (s) => ['--wait', '--', 'sh', '-c', s] },
  { bin: 'kgx', args: (s) => ['--', 'sh', '-c', s] },
  { bin: 'konsole', args: (s) => ['--nofork', '-e', 'sh', '-c', s] },
  { bin: 'xfce4-terminal', args: (s) => ['--disable-server', '-x', 'sh', '-c', s] },
  { bin: 'mate-terminal', args: (s) => ['--disable-factory', '-x', 'sh', '-c', s] },
  { bin: 'kitty', args: (s) => ['sh', '-c', s] },
  { bin: 'alacritty', args: (s) => ['-e', 'sh', '-c', s] },
  { bin: 'xterm', args: (s) => ['-e', 'sh', '-c', s] },
];

/** True when `installed` (from `dpkg-query -W -f='${Version}'`) is the version the update was meant to install. */
export const installedMatches = (installed: string, wanted: string) => installed.trim() === wanted.trim();

/** True when /proc/<pid>/status says the process (and so everything it starts) can never gain privileges: pkexec and sudo both refuse to run then. */
export const hasNoNewPrivs = (procStatus: string) => /^NoNewPrivs:\s*1\s*$/m.test(procStatus);

export const NO_NEW_PRIVS_MESSAGE =
  'This copy of Music Curator was started in a way that forbids asking for a password (the "no new privileges" flag is set, for example by a sandbox or a container), so it cannot install the update itself. Install it from a normal terminal instead (the AppImage build does not need this):';
