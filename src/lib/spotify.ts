import { Artist, Song } from './types';

// Define Spotify API response interfaces
interface SpotifyArtist {
	name: string;
	id: string;
}

interface SpotifyAlbum {
	name: string;
	release_date: string;
}

interface SpotifyTrack {
	id: string;
	name: string;
	artists: SpotifyArtist[];
	album: SpotifyAlbum;
	duration_ms: number;
	popularity: number;
}

interface SpotifyTrackItem {
	track: SpotifyTrack;
}

interface SpotifyPlaylistResponse {
	tracks: {
		items: SpotifyTrackItem[];
	};
}

// Function to get playlist details including tracks
export async function getSpotifyPlaylist(): Promise<{
	artists: Artist[];
	allSongs: Song[];
}> {
	try {
		// Call our API route instead of Spotify directly
		const response = await fetch('/api/spotify');

		if (!response.ok) {
			throw new Error(
				`Failed to fetch playlist: ${response.statusText}`
			);
		}

		const playlistData =
			(await response.json()) as SpotifyPlaylistResponse;
		const tracks = playlistData.tracks.items;

		// Map tracks to Song objects
		const songs: Song[] = tracks.map(
			(item: SpotifyTrackItem, index: number) => {
				const track = item.track;

				return {
					id: track.id || `song-${index}`,
					number: index + 1,
					song: track.name || '',
					artist: track.artists
						.map((artist: SpotifyArtist) => artist.name)
						.join(', '),
					popularity: track.popularity || 0,
					bpm: 0, // BPM isn't directly available from Spotify API
					genres: '', // We would need additional API calls to get genres
					album: track.album.name || '',
					albumDate: track.album.release_date || '',
					time:
						Math.floor(track.duration_ms / 60000) +
						':' +
						String(
							Math.floor((track.duration_ms % 60000) / 1000)
						).padStart(2, '0'),
					spotify: track.id || '',
				};
			}
		);

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
		console.error('Error fetching Spotify playlist:', error);
		throw error;
	}
}
