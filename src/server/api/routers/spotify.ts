import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

// Define Spotify API response interfaces
interface SpotifyArtist {
	id: string;
	name: string;
}

interface SpotifyAlbum {
	id: string;
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

interface SpotifyPaginatedResponse {
	items: SpotifyTrackItem[];
	next: string | null;
	total: number;
}

interface SpotifyPlaylistInfo {
	name: string;
	description: string;
	followers: { total: number };
	images: { url: string; height: number; width: number }[];
}

const SPOTIFY_PLAYLIST_ID = '6oicpmZcmaD6rqjhfqge7l';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Helper function to get access token using client credentials flow
async function getAccessToken(): Promise<string> {
	const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error(
			'Spotify credentials not found in environment variables'
		);
	}

	try {
		const response = await fetch(
			'https://accounts.spotify.com/api/token',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${Buffer.from(
						`${clientId}:${clientSecret}`
					).toString('base64')}`,
				},
				body: new URLSearchParams({
					grant_type: 'client_credentials',
				}),
			}
		);

		if (!response.ok) {
			throw new Error(
				`Failed to get access token: ${response.statusText}`
			);
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.error('Error getting Spotify access token:', error);
		throw error;
	}
}

// Helper function to fetch all playlist tracks with pagination
async function getAllPlaylistTracks(
	accessToken: string
): Promise<SpotifyTrackItem[]> {
	let tracks: SpotifyTrackItem[] = [];
	let url = `${SPOTIFY_API_URL}/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?fields=items(track(name,id,artists,album,duration_ms,popularity)),next,total`;

	// Keep fetching until we have all tracks
	while (url) {
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch playlist tracks: ${response.statusText}`
			);
		}

		const data = (await response.json()) as SpotifyPaginatedResponse;
		tracks = [...tracks, ...data.items];

		// Check if there are more tracks to fetch
		url = data.next || '';
	}

	return tracks;
}

// Helper function to get playlist info
async function getPlaylistInfo(
	accessToken: string
): Promise<SpotifyPlaylistInfo> {
	const response = await fetch(
		`${SPOTIFY_API_URL}/playlists/${SPOTIFY_PLAYLIST_ID}?fields=name,description,followers,images`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch playlist info: ${response.statusText}`
		);
	}

	return await response.json();
}

export const spotifyRouter = router({
	getPlaylist: publicProcedure.query(async () => {
		try {
			const accessToken = await getAccessToken();

			// Get both playlist info and tracks in parallel
			const [playlistInfo, tracks] = await Promise.all([
				getPlaylistInfo(accessToken),
				getAllPlaylistTracks(accessToken),
			]);

			// Combine into a single response object
			return {
				...playlistInfo,
				tracks: { items: tracks },
			};
		} catch (error) {
			console.error('Error fetching Spotify playlist:', error);
			throw error;
		}
	}),

	// Optional: Add a procedure to fetch with a custom playlist ID
	getPlaylistById: publicProcedure
		.input(z.object({ playlistId: z.string() }))
		.query(async ({ input }) => {
			// Implementation would be similar but use input.playlistId instead of the hardcoded one
			// This is just a stub for now
			return {
				message: `Would fetch playlist with ID: ${input.playlistId}`,
			};
		}),
});
