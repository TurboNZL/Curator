import { defineHandler } from "nitro";
import { db } from '../../db';
import { profiles } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(profiles);
  }
});
