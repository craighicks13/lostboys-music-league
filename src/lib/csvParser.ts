import Papa from 'papaparse';
import { Artist, Song } from './types';

export async function fetchAndParseCSV(): Promise<{
	artists: Artist[];
	allSongs: Song[];
}> {
	try {
		const response = await fetch('/Total Lost Boys Music League.csv');
		const csvText = await response.text();

		const { data } = Papa.parse(csvText, {
			header: true,
			skipEmptyLines: true,
		});

		const songs = data.map((row: any, index) => ({
			id: row.ISRC || `song-${index}`,
			number: parseInt(row['#']) || index + 1,
			song: row.Song || '',
			artist: row.Artist || '',
			popularity: parseInt(row.Popularity) || 0,
			bpm: parseInt(row.BPM) || 0,
			genres: row.Genres || '',
			album: row.Album || '',
			albumDate: row['Album Date'] || '',
			time: row.Time || '',
			spotify: row['Spotify Track Id'] || '',
		}));

		// Group songs by artist
		const artistMap = new Map<string, Song[]>();

		for (const song of songs) {
			// Some artists may include featuring artists with commas
			// We'll consider the main artist to be the first one listed
			const artists = song.artist.split(',');
			const mainArtist = artists[0].trim();

			if (!artistMap.has(mainArtist)) {
				artistMap.set(mainArtist, []);
			}

			artistMap.get(mainArtist)?.push(song);
		}

		// Convert map to array of Artist objects
		const artists = Array.from(artistMap.entries()).map(
			([name, songs]) => ({
				name,
				songs,
			})
		);

		// Sort artists alphabetically
		artists.sort((a, b) => a.name.localeCompare(b.name));

		return { artists, allSongs: songs };
	} catch (error) {
		console.error('Error parsing CSV:', error);
		return { artists: [], allSongs: [] };
	}
}
