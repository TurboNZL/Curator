import { Artist, Album, Track, TimelineEntry } from '../types/music';

export const MOCK_ARTISTS: Artist[] = [
  {
    id: 'a1',
    name: 'Kanye West',
    image: 'https://images.unsplash.com/photo-1542124113-911d041ca49e?w=400&h=400&fit=crop',
    eras: [
      { id: 'e1', artistId: 'a1', name: 'The College Trilogy', description: '2004-2007: Soul-sampling era' },
      { id: 'e2', artistId: 'a1', name: 'Experimental / Yeezus', description: '2013-2015: Industrial and harsh sounds' }
    ],
    // Removed groups: []
  },
  {
    id: 'a2',
    name: 'Radiohead',
    image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=400&fit=crop',
    eras: [
      { id: 'e3', artistId: 'a2', name: 'Alternative Rock', description: '90s era' },
      { id: 'e4', artistId: 'a2', name: 'Electronic / IDM', description: 'Kid A / Amnesiac period' }
    ],
    // Removed groups: []
  }
];

export const MOCK_ALBUMS: Album[] = [
  {
    id: 'al1',
    title: 'The College Dropout',
    artistId: 'a1',
    // Removed artistIds: ['a1'],
    eraId: 'e1',
    primaryCover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
    pendingFiles: [],
    // Removed credits: [],
    artistCredits: [{ artistId: 'a1', role: ['Lead artist'] }], // NEW: Album artist credits (role: string[])
    genres: [], // Added genres
  },
  {
    id: 'al2',
    title: 'Kid A',
    artistId: 'a2',
    // Removed artistIds: ['a2'],
    eraId: 'e4',
    primaryCover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
    pendingFiles: [],
    // Removed credits: [],
    artistCredits: [{ artistId: 'a2', role: ['Lead artist'] }], // NEW: Album artist credits (role: string[])
    genres: [], // Added genres
  }
];

export const MOCK_TIMELINE: TimelineEntry[] = [
  {
    id: 't1',
    type: 'entry',
    timestamp: new Date(Date.now() - 3600000),
    title: 'Imported local library',
    description: 'Synced 1,240 tracks from /Music/Curator/Local'
  },
  {
    id: 't2',
    type: 'rating',
    timestamp: new Date(Date.now() - 7200000),
    title: 'Rated "Everything In Its Right Place"',
    description: 'Balanced Rating updated: 9.2 -> 9.4',
    entityId: 'tr1'
  }
];