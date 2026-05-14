import { defineHandler } from "nitro";
import { readMultipartFormData, createError } from "h3";
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

export default defineHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' });
  }

  const file = formData.find(item => item.name === 'file');
  const type = formData.find(item => item.name === 'type')?.data.toString() || 'misc';

  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' });
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', type);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const extension = file.filename?.split('.').pop() || 'bin';
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = join(uploadDir, fileName);

  writeFileSync(filePath, file.data);

  return {
    url: `/uploads/${type}/${fileName}`,
    fileName: file.filename
  };
});