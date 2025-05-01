import { useState, useEffect } from 'react';
import { Artist, Song } from './types';
import { fetchAndParseCSV } from './csvParser';
import { formatTrackData } from './formatters';

// Define types for Spotify API responses
interface SpotifyArtist {
	id: string;
	name: string;
}

interface SpotifyAlbum {
	id?: string;
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

interface SpotifyPlaylistData {
	tracks: {
		items: SpotifyTrackItem[];
	};
}

export function useWindowSize() {
	const [windowSize, setWindowSize] = useState<{
		width: number;
		height: number;
	}>({
		width: typeof window !== 'undefined' ? window.innerWidth : 0,
		height: typeof window !== 'undefined' ? window.innerHeight : 0,
	});

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		}

		window.addEventListener('resize', handleResize);

		// Call handler right away to update initial size
		handleResize();

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return windowSize;
}

/**
 * Hook for processing Spotify playlist data with CSV fallback
 */
export function usePlaylistData(
	playlistData: SpotifyPlaylistData | undefined,
	queryError: unknown
) {
	const [error, setError] = useState<string | null>(null);
	const [allSongs, setAllSongs] = useState<Song[]>([]);
	const [artists, setArtists] = useState<Artist[]>([]);

	// Process data when playlistData changes
	useEffect(() => {
		if (playlistData && playlistData.tracks?.items) {
			const processedArtists: Artist[] = [];
			const processedSongs: Song[] = [];
			// Group songs by artist
			const artistMap = new Map<string, Song[]>();

			playlistData.tracks.items.forEach(
				(item: SpotifyTrackItem, index: number) => {
					const track = item.track;
					if (!track) return;

					// Use formatter to standardize song data
					const song = formatTrackData(track, index);

					// Add to songs array
					processedSongs.push(song);

					// Process artist
					const artistName =
						track.artists?.[0]?.name?.trim() || 'Unknown Artist';
					if (!artistMap.has(artistName)) {
						artistMap.set(artistName, []);
					}
					artistMap.get(artistName)?.push(song);
				}
			);

			// Convert map to array of Artist objects and sort alphabetically
			Array.from(artistMap.entries())
				.map(([name, songs]) => ({ name, songs }))
				.sort((a, b) => a.name.localeCompare(b.name))
				.forEach((artist) => processedArtists.push(artist));

			// Update state with processed data
			setArtists(processedArtists);
			setAllSongs(processedSongs);
		}
	}, [playlistData]);

	// Handle errors and process data
	useEffect(() => {
		// Handle query success
		if (playlistData) {
			setError(null);
		}

		// Handle errors
		if (queryError) {
			console.error('Failed to load data:', queryError);
			setError(
				'Failed to load playlist data from Spotify. Please check your credentials.'
			);

			// Try to load from CSV as fallback
			handleFallbackToCSV().then(({ csvArtists, csvSongs }) => {
				if (csvArtists.length > 0) {
					setError('Using local CSV data as fallback.');
					setArtists(csvArtists);
					setAllSongs(csvSongs);
				}
			});
		}
	}, [playlistData, queryError]);

	// Handle fallback to CSV if needed
	async function handleFallbackToCSV() {
		try {
			const { artists: csvArtists, allSongs: csvSongs } =
				await fetchAndParseCSV();
			return { csvArtists, csvSongs };
		} catch (csvError) {
			console.error('Failed to load CSV data:', csvError);
			setError(
				'Failed to load data from both Spotify and local CSV.'
			);
			return { csvArtists: [] as Artist[], csvSongs: [] as Song[] };
		}
	}

	return {
		artists,
		allSongs,
		error,
		isLoading: !playlistData && !queryError,
	};
}
