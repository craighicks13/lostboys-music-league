import { SignJWT, importPKCS8 } from "jose";
import type { TrackMetadata } from "./spotify";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAppleMusicToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt - now > 3600_000) {
    return cachedToken;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPem = process.env.APPLE_MUSIC_PRIVATE_KEY;
  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error(
      "Missing APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_MUSIC_PRIVATE_KEY env vars"
    );
  }

  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  const expiresIn = 180 * 24 * 60 * 60; // 6 months in seconds

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(privateKey);

  cachedToken = token;
  tokenExpiresAt = now + expiresIn * 1000;

  return cachedToken;
}

interface AppleMusicSongAttributes {
  name: string;
  artistName: string;
  albumName: string;
  artwork: { url: string };
  durationInMillis: number;
  previews: { url: string }[];
  url: string;
  genreNames?: string[];
}

interface AppleMusicResponse {
  data: { attributes: AppleMusicSongAttributes }[];
}

export async function fetchAppleMusicTrack(
  songId: string,
  storefront = "us"
): Promise<TrackMetadata> {
  const token = await getAppleMusicToken();

  const res = await fetch(
    `https://api.music.apple.com/v1/catalog/${storefront}/songs/${songId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.status === 404) {
    throw new Error(`Apple Music track not found: ${songId}`);
  }

  if (!res.ok) {
    throw new Error(`Apple Music API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as AppleMusicResponse;
  const attrs = body.data[0]?.attributes;
  if (!attrs) {
    throw new Error(`Apple Music track not found: ${songId}`);
  }

  return {
    provider: "apple",
    providerTrackId: songId,
    trackName: attrs.name,
    artist: attrs.artistName,
    album: attrs.albumName,
    artworkUrl: attrs.artwork.url
      .replace("{w}", "640")
      .replace("{h}", "640"),
    duration: attrs.durationInMillis,
    previewUrl: attrs.previews[0]?.url ?? null,
    providerUrl: attrs.url,
    genres: attrs.genreNames ?? [],
  };
}
