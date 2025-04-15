import Papa from 'papaparse';
import { Artist, Song } from './types';

// Define interface for CSV row data
interface CSVRow {
	'#': string;
	Song: string;
	Artist: string;
	Popularity: string;
	BPM: string;
	Genres: string;
	Album: string;
	'Album Date': string;
	Time: string;
	'Spotify Track Id': string;
	ISRC: string;
	[key: string]: string; // For any other columns
}

export async function fetchAndParseCSV(): Promise<{
	artists: Artist[];
	allSongs: Song[];
}> {
	try {
		const response = await fetch('/Total Lost Boys Music League.csv');
		const csvText = await response.text();

		const { data } = Papa.parse<CSVRow>(csvText, {
			header: true,
			skipEmptyLines: true,
		});

		const songs = data.map((row, index) => ({
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
