import { Song } from './types';

// Interfaces for Spotify API track data
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

/**
 * Format track duration from milliseconds to MM:SS format
 */
export function formatDuration(durationMs: number): string {
	if (!durationMs) return '';

	const minutes = Math.floor(durationMs / 60000);
	const seconds = Math.floor((durationMs % 60000) / 1000);

	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Process track data into a formatted Song object
 */
export function formatTrackData(
	track: SpotifyTrack,
	index: number
): Song {
	if (!track) {
		throw new Error('Track data is required');
	}

	return {
		id: track.id || `song-${index}`,
		number: index + 1,
		song: track.name || '',
		artist:
			track.artists
				?.map((artist: SpotifyArtist) => artist.name)
				.join(', ') || '',
		popularity: track.popularity || 0,
		bpm: 0,
		genres: '',
		album: track.album?.name || '',
		albumDate: track.album?.release_date || '',
		time: formatDuration(track.duration_ms),
		spotify: track.id || '',
	};
}
