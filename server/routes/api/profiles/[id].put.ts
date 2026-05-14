import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const body = await readBody(event);
  
  await db.update(profiles)
    .set({
      name: body.name,
      theme: body.theme,
      accentColor: body.accentColor,
      playbackMode: body.playbackMode,
      settings: body.settings,
    })
    .where(eq(profiles.id, id));

  return { success: true };
});
