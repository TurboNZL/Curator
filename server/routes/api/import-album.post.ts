import { defineEventHandler, readBody, createError } from "h3";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url } = body;

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: "URL is required",
    });
  }

  // Path to the executable
  // In development, it's in server/bin/ytmpcli.exe
  // We use process.cwd() to get the root directory
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ytmpcli.exe" : "ytmpcli";
  const exePath = path.join(process.cwd(), "server", "bin", exeName);

  if (!fs.existsSync(exePath)) {
    // Try without .exe if on linux and .exe exists
    const altPath = path.join(process.cwd(), "server", "bin", "ytmpcli.exe");
    if (!isWindows && fs.existsSync(altPath)) {
      // On Linux, we can't run .exe directly unless it's through wine
      throw createError({
        statusCode: 500,
        statusMessage: `Cannot run Windows executable (.exe) on ${process.platform}. Please provide a Linux binary.`,
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Executable not found at ${exePath}`,
    });
  }

  console.log(`Starting import for URL: ${url} using ${exePath}`);

  // Execute the program
  // We use execFile for security (avoids shell injection)
  // We don't wait for it to finish if it's a long process, 
  // but for now let's wait to see if it works or fails immediately.
  
  return new Promise((resolve, reject) => {
    const child = execFile(exePath, [url], (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ytmpcli: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(createError({
          statusCode: 500,
          statusMessage: `Import failed: ${error.message}`,
          data: { stderr }
        }));
        return;
      }
      
      console.log(`ytmpcli stdout: ${stdout}`);
      if (stderr) {
        console.warn(`ytmpcli stderr: ${stderr}`);
      }
      
      resolve({
        success: true,
        message: "Import completed successfully",
        output: stdout
      });
    });
  });
});
