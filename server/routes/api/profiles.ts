import { defineHandler } from "nitro";
import { db } from '../../db';
import { profiles } from '../../db/schema';

export default defineHandler(async (event) => {
  const allProfiles = await db.select().from(profiles);
  
  if (allProfiles.length === 0) {
    const defaultProfile = {
      id: '1',
      name: 'Main Curator',
      theme: 'dark',
      accentColor: '#3b82f6',
      playback_mode: 'local',
      settings: JSON.stringify({ showUnbalancedFirst: false }),
      playbackRules: '[]'
    };
    await db.insert(profiles).values(defaultProfile);
    return [defaultProfile];
  }
  
  return allProfiles;
});
