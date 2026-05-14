import { initDb } from '../db';

export default async (nitroApp: any) => {
  console.log('Initializing Database with LibSQL...');
  await initDb();
};
