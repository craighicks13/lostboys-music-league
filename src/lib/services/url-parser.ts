export interface ParsedTrackUrl {
  provider: "spotify" | "apple";
  trackId: string;
  storefront?: string;
}

export function parseTrackUrl(input: string): ParsedTrackUrl | null {
  // Spotify URI: spotify:track:{id}
  const spotifyUriMatch = input.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (spotifyUriMatch) {
    return { provider: "spotify", trackId: spotifyUriMatch[1] };
  }

  // Spotify URL: https://open.spotify.com/track/{id} or /intl-{lang}/track/{id}
  const spotifyUrlMatch = input.match(
    /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/
  );
  if (spotifyUrlMatch) {
    return { provider: "spotify", trackId: spotifyUrlMatch[1] };
  }

  // Apple Music song in album: https://music.apple.com/{storefront}/album/{name}/{albumId}?i={songId}
  const appleAlbumMatch = input.match(
    /^https?:\/\/music\.apple\.com\/([a-z]{2})\/album\/[^/]+\/\d+\?.*?\bi=(\d+)/
  );
  if (appleAlbumMatch) {
    return {
      provider: "apple",
      trackId: appleAlbumMatch[2],
      storefront: appleAlbumMatch[1],
    };
  }

  // Apple Music direct song: https://music.apple.com/{storefront}/song/{name}/{songId}
  const appleSongMatch = input.match(
    /^https?:\/\/music\.apple\.com\/([a-z]{2})\/song\/[^/]+\/(\d+)/
  );
  if (appleSongMatch) {
    return {
      provider: "apple",
      trackId: appleSongMatch[2],
      storefront: appleSongMatch[1],
    };
  }

  return null;
}
