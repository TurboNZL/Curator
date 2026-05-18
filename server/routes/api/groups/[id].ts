import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { groups, groupMembers } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;
  console.log(`Group route hit: ${method} ${id}`);

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    await db.update(groups)
      .set({
        name: body.name,
        description: body.description,
        label: body.label,
        type: body.type,
        isArtistOnly: body.isArtistOnly ? 1 : 0,
      })
      .where(eq(groups.id, id));

    // Update members if provided
    if (body.members && Array.isArray(body.members)) {
      // Delete existing members
      await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
      // Insert new members
      for (const member of body.members) {
        await db.insert(groupMembers).values({
          groupId: id,
          entityType: member.entityType,
          entityId: member.entityId
        });
      }
    }
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
    await db.delete(groups).where(eq(groups.id, id));
    return { success: true };
  }
});
