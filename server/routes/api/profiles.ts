import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { profiles } from '../../db/schema';

export default defineHandler(async (event) => {
  const allProfiles = await db.select().from(profiles);
  
  // Parse settings and playbackRules for consistency
  const parsedProfiles = allProfiles.map(p => ({
    ...p,
    settings: p.settings ? JSON.parse(p.settings) : {},
    playbackRules: p.playbackRules ? JSON.parse(p.playbackRules) : [],
  }));

  if (parsedProfiles.length === 0) {
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
    // Return the newly created default profile, ensuring fields are parsed
    return [{
      ...defaultProfile,
      settings: JSON.parse(defaultProfile.settings),
      playbackRules: JSON.parse(defaultProfile.playbackRules),
    }];
  }
  
  return parsedProfiles;
});