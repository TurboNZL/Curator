import { defineHandler } from "nitro";
import { join } from 'path';
import { readdirSync, renameSync, existsSync, rmSync, statSync, mkdirSync } from 'fs';
import { createError } from "h3";

export default defineHandler(async (event) => {
  const publicDir = join(process.cwd(), 'public');
  const oldUploadsDir = join(publicDir, 'uploads');
  const oldAudioDir = join(oldUploadsDir, 'audio');
  const oldImageDir = join(oldUploadsDir, 'image');
  const newMusicDir = join(publicDir, 'music');
  const newImagesDir = join(publicDir, 'images');

  const movedFiles: string[] = [];
  const errors: string[] = [];

  // Ensure new directories exist
  if (!existsSync(newMusicDir)) {
    mkdirSync(newMusicDir, { recursive: true });
  }
  if (!existsSync(newImagesDir)) {
    mkdirSync(newImagesDir, { recursive: true });
  }

  // Function to move files from source to destination
  const moveFiles = (sourceDir: string, destinationDir: string) => {
    if (existsSync(sourceDir)) {
      const files = readdirSync(sourceDir);
      for (const file of files) {
        const oldPath = join(sourceDir, file);
        const newPath = join(destinationDir, file);
        try {
          // Check if it's a file before attempting to move
          if (statSync(oldPath).isFile()) {
            renameSync(oldPath, newPath);
            movedFiles.push(file);
          }
        } catch (e: any) {
          errors.push(`Failed to move ${file} from ${sourceDir} to ${destinationDir}: ${e.message}`);
          console.error(`Failed to move ${file}:`, e);
        }
      }
    }
  };

  // Move audio files
  moveFiles(oldAudioDir, newMusicDir);

  // Move image files
  moveFiles(oldImageDir, newImagesDir);

  // Clean up old directories if empty
  try {
    if (existsSync(oldAudioDir) && readdirSync(oldAudioDir).length === 0) {
      rmSync(oldAudioDir, { recursive: true, force: true });
      movedFiles.push(`Removed empty directory: ${oldAudioDir}`);
    }
    if (existsSync(oldImageDir) && readdirSync(oldImageDir).length === 0) {
      rmSync(oldImageDir, { recursive: true, force: true });
      movedFiles.push(`Removed empty directory: ${oldImageDir}`);
    }
    if (existsSync(oldUploadsDir) && readdirSync(oldUploadsDir).length === 0) {
        rmSync(oldUploadsDir, { recursive: true, force: true });
        movedFiles.push(`Removed empty directory: ${oldUploadsDir}`);
    }
  } catch (e: any) {
    errors.push(`Failed to clean up old directories: ${e.message}`);
    console.error(`Failed to clean up old directories:`, e);
  }


  if (errors.length > 0) {
    throw createError({ statusCode: 500, statusMessage: 'File migration completed with errors', data: { movedFiles, errors } });
  }

  return { message: 'Files migrated successfully!', movedFiles };
});