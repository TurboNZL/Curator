import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { roleCategories } from '../../db/schema';

export default defineHandler(async (event) => {
  if (event.method === 'POST') {
    const body = await readBody(event) as any;
    const { name } = body;

    if (!name) {
      throw new Error("Role category name is required");
    }

    const newRole = {
      id: Math.random().toString(36).substring(7),
      name,
      isRemovable: true,
    };

    await db.insert(roleCategories).values(newRole);
    return newRole;
  }
});