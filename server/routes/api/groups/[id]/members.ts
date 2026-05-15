import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { groupMembers } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const groupId = event.context.params?.id;
  if (!groupId) return { error: 'Missing Group ID' };

  const method = event.method;
  const body = await readBody(event) as any;

  if (method === 'POST') {
    await db.insert(groupMembers).values({
      groupId,
      entityType: body.entityType,
      entityId: body.entityId
    });
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(groupMembers).where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.entityType, body.entityType),
        eq(groupMembers.entityId, body.entityId)
      )
    );
    return { success: true };
  }
});
