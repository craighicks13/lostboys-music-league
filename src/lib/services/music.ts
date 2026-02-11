import type { TrackMetadata } from "./spotify";
import { fetchSpotifyTrack } from "./spotify";
import { fetchAppleMusicTrack } from "./apple-music";
import { parseTrackUrl } from "./url-parser";

export type { TrackMetadata };

export async function fetchTrackMetadata(
  provider: "spotify" | "apple",
  trackId: string,
  opts?: { storefront?: string }
): Promise<TrackMetadata> {
  if (provider === "spotify") {
    return fetchSpotifyTrack(trackId);
  }
  return fetchAppleMusicTrack(trackId, opts?.storefront);
}

export async function fetchTrackFromUrl(url: string): Promise<TrackMetadata> {
  const parsed = parseTrackUrl(url);
  if (!parsed) {
    throw new Error(`Unrecognized track URL: ${url}`);
  }
  return fetchTrackMetadata(parsed.provider, parsed.trackId, {
    storefront: parsed.storefront,
  });
}
