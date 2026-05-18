import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { groups, groupMembers, artists, albums, tracks, releases } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allGroups = await db.select().from(groups);
    const allMembers = await db.select().from(groupMembers);
    
    const artistsList = await db.select().from(artists);
    const albumsList = await db.select().from(albums);
    const tracksList = await db.select().from(tracks);
    const releasesList = await db.select().from(releases);

    return allGroups.map(g => {
      const members = allMembers.filter(m => m.groupId === g.id).map(m => {
        let label = 'Unknown';
        if (m.entityType === 'artist') label = artistsList.find(a => a.id === m.entityId)?.name || label;
        if (m.entityType === 'album') label = albumsList.find(a => a.id === m.entityId)?.title || label;
        if (m.entityType === 'track') label = tracksList.find(t => t.id === m.entityId)?.title || label;
        if (m.entityType === 'release') label = releasesList.find(r => r.id === m.entityId)?.title || label;
        return { ...m, label, showOnEntityPage: !!m.showOnEntityPage };
      });
      return { ...g, members };
    });
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newGroup = {
      id,
      name: body.name,
      description: body.description,
      label: body.label,
      type: body.type || 'relationship',
      isArtistOnly: body.isArtistOnly ? 1 : 0, // Kept for DB compatibility, but will be ignored in UI
    };

    await db.insert(groups).values(newGroup);

    if (body.members && Array.isArray(body.members)) {
      for (const member of body.members) {
        await db.insert(groupMembers).values({
          groupId: id,
          entityType: member.entityType,
          entityId: member.entityId,
          showOnEntityPage: member.showOnEntityPage ? 1 : 0,
        });
      }
    }

    return { 
      ...newGroup, 
      members: body.members ? body.members.map((m: any) => ({ ...m, label: m.label || '', showOnEntityPage: !!m.showOnEntityPage })) : [] 
    };
  }
});