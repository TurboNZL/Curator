import { defineHandler } from "nitro";
import { db } from '../../db';
import { roleCategories } from '../../db/schema';
import { asc } from 'drizzle-orm';

export default defineHandler(async (event) => {
  if (event.method === 'GET') {
    const allRoles = await db.select().from(roleCategories).orderBy(asc(roleCategories.name));
    return allRoles;
  }
});