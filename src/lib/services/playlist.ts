import { generateSpotifyPlaylist } from "./spotify-playlist";
import { generateAppleMusicPlaylist } from "./apple-music-playlist";
import { getAppleMusicToken } from "./apple-music";

export interface PlaylistResult {
  provider: "spotify" | "apple";
  playlistId: string;
  externalUrl?: string;
}

export interface GeneratePlaylistOptions {
  provider: "spotify" | "apple";
  roundTheme: string;
  leagueName: string;
  trackIds: string[]; // provider-specific track IDs
  /** Required for Spotify — user's OAuth access token */
  spotifyAccessToken?: string;
  /** Required for Apple Music — Music User Token from MusicKit JS */
  appleMusicUserToken?: string;
}

/**
 * Generate a playlist in the user's streaming service.
 * Returns the playlist ID and optional external URL.
 */
export async function generatePlaylist(
  options: GeneratePlaylistOptions
): Promise<PlaylistResult> {
  const { provider, roundTheme, leagueName, trackIds } = options;

  if (provider === "spotify") {
    if (!options.spotifyAccessToken) {
      throw new Error("Spotify access token required for playlist generation");
    }

    const result = await generateSpotifyPlaylist({
      accessToken: options.spotifyAccessToken,
      roundTheme,
      leagueName,
      trackIds,
    });

    return {
      provider: "spotify",
      playlistId: result.playlistId,
      externalUrl: result.externalUrl,
    };
  }

  if (provider === "apple") {
    if (!options.appleMusicUserToken) {
      throw new Error(
        "Apple Music User Token required for playlist generation"
      );
    }

    const developerToken = await getAppleMusicToken();
    const result = await generateAppleMusicPlaylist({
      developerToken,
      musicUserToken: options.appleMusicUserToken,
      roundTheme,
      leagueName,
      trackIds,
    });

    return {
      provider: "apple",
      playlistId: result.playlistId,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
