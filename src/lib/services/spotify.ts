export interface TrackMetadata {
  provider: "spotify" | "apple";
  providerTrackId: string;
  trackName: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  duration: number; // milliseconds
  previewUrl: string | null;
  providerUrl: string;
  genres?: string[];
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt - now > 60_000) {
    return cachedToken;
  }

  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing AUTH_SPOTIFY_ID or AUTH_SPOTIFY_SECRET env vars");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}

interface SpotifyTrackResponse {
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

interface SpotifyArtistResponse {
  genres: string[];
}

async function fetchArtistGenres(
  artistId: string,
  token: string
): Promise<string[]> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const artist = (await res.json()) as SpotifyArtistResponse;
    return artist.genres ?? [];
  } catch {
    return [];
  }
}

export async function fetchSpotifyTrack(trackId: string): Promise<TrackMetadata> {
  let token = await getSpotifyToken();

  let res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // On 401, refresh token and retry once
  if (res.status === 401) {
    cachedToken = null;
    token = await getSpotifyToken();
    res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (res.status === 404) {
    throw new Error(`Spotify track not found: ${trackId}`);
  }

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }

  const track = (await res.json()) as SpotifyTrackResponse;

  const primaryArtistId = track.artists[0]?.id;
  const genres = primaryArtistId
    ? await fetchArtistGenres(primaryArtistId, token)
    : [];

  return {
    provider: "spotify",
    providerTrackId: trackId,
    trackName: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album.name,
    artworkUrl: track.album.images[0]?.url ?? null,
    duration: track.duration_ms,
    previewUrl: track.preview_url,
    providerUrl: track.external_urls.spotify,
    genres,
  };
}
