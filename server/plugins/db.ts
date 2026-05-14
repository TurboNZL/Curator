import { initDb } from '../db';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('Initializing Database with LibSQL...');
  await initDb();
});