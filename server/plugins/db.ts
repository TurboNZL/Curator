import { initDb } from '../db';

export default defineNitroPlugin((nitroApp) => {
  console.log('Initializing Database...');
  initDb();
});
