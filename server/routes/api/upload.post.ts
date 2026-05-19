import { defineHandler } from "nitro";
import { readMultipartFormData, createError } from "h3";
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer'; // Import Buffer

export default defineHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' });
  }

  const file = formData.find(item => item.name === 'file');
  const typeItem = formData.find(item => item.name === 'type');
  const type = typeItem?.data ? Buffer.from(typeItem.data).toString('utf8') : 'misc'; // Correct parsing of type

  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' });
  }

  const baseUploadDir = join(process.cwd(), 'public');
  let finalUploadDir;

  if (type === 'audio') {
    finalUploadDir = join(baseUploadDir, 'uploads', 'music'); // Corrected path
  } else if (type === 'image') {
    finalUploadDir = join(baseUploadDir, 'uploads', 'images'); // Corrected path
  } else {
    // Fallback for other types, though the prompt only specifies music and images
    finalUploadDir = join(baseUploadDir, 'uploads', type);
  }

  if (!existsSync(finalUploadDir)) {
    mkdirSync(finalUploadDir, { recursive: true });
  }

  const extension = file.filename?.split('.').pop() || 'bin';
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = join(finalUploadDir, fileName);

  writeFileSync(filePath, file.data);

  return {
    url: `/uploads/${type === 'audio' ? 'music' : type === 'image' ? 'images' : type}/${fileName}`, // Corrected URL
    fileName: file.filename
  };
});