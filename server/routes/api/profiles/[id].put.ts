import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const body = await readBody(event) as any;
  
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.theme !== undefined) updateData.theme = body.theme;
  if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
  if (body.playbackMode !== undefined) updateData.playback_mode = body.playbackMode;
  if (body.settings !== undefined) updateData.settings = body.settings;
  
  await db.update(profiles)
    .set(updateData)
    .where(eq(profiles.id, id));

  return { success: true };
});
