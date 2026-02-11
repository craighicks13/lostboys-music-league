"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface OpenInProviderProps {
  provider: "spotify" | "apple";
  providerTrackId: string;
  providerUrl?: string;
}

export function OpenInProvider({
  provider,
  providerTrackId,
  providerUrl,
}: OpenInProviderProps) {
  const href =
    providerUrl ??
    (provider === "spotify"
      ? `https://open.spotify.com/track/${providerTrackId}`
      : `https://music.apple.com/song/${providerTrackId}`);

  const label =
    provider === "spotify" ? "Open in Spotify" : "Open in Apple Music";

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
