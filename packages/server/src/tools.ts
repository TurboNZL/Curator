import { spawn } from 'node:child_process';
import { join } from 'node:path';

/** First line of `<cmd> <args>` output, or null when the program is missing or fails. */
function firstLine(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let out = '';
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    const timer = setTimeout(() => { child.kill(); resolve(null); }, 5000);
    child.stdout.on('data', (d: Buffer) => { if (out.length < 400) out += d.toString(); });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0 ? out.split('\n')[0].trim() || 'ok' : null); });
  });
}

export interface ToolStatus { ytdlp: string | null; ffmpeg: string | null }

/** Whether the programs that YouTube import / audio download need can actually be run (so Settings can say so). */
export async function checkTools(o: { ytdlp?: string; ffmpegDir?: string }): Promise<ToolStatus> {
  const [ytdlp, ffmpeg] = await Promise.all([
    firstLine(o.ytdlp ?? 'yt-dlp', ['--version']),
    firstLine(o.ffmpegDir ? join(o.ffmpegDir, 'ffmpeg') : 'ffmpeg', ['-version']).then((l) => l?.replace(/^ffmpeg version\s+/i, '').split(' ')[0] ?? null),
  ]);
  return { ytdlp, ffmpeg };
}
