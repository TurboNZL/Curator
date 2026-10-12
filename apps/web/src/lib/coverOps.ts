import { useStore } from './store.ts';
import { planRemoveCover } from './covers.ts';

/** Deletes an image from an album's pool for good and clears everything that pointed at it. */
export function removeCoverFromAlbum(albumId: string, hash: string) {
  const st = useStore.getState();
  const album = st.rows.albums.get(albumId);
  if (!album || album.deleted) return;
  const releases = [...st.rows.releases.values()].filter((r) => !r.deleted && (r.data as { albumId?: string }).albumId === albumId).map((r) => ({ id: r.id, cover: (r.data as { cover: string | null }).cover }));
  const plan = planRemoveCover(album.data as { cover?: string | null; covers?: string[]; coverPicked?: boolean }, releases, hash);
  for (const id of plan.releaseIds) st.put('releases', { ...(st.rows.releases.get(id)!.data as object), cover: null }, id, { forget: [hash] });
  st.put('albums', { ...(album.data as object), ...plan.album }, albumId, { forget: [hash] });
}
