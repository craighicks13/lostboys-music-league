"use client";

import { useState } from "react";
import { Music, ExternalLink, Loader2, ListMusic } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface PlaylistLinksProps {
  roundId: string;
  isAdmin: boolean;
}

export function PlaylistLinks({ roundId, isAdmin }: PlaylistLinksProps) {
  const [generating, setGenerating] = useState<"spotify" | "apple" | null>(
    null
  );

  const {
    data: links,
    isLoading,
    refetch,
  } = trpc.playlist.getLinks.useQuery(
    { roundId },
    { enabled: !!roundId }
  );

  const generateSpotify = trpc.playlist.generateSpotify.useMutation({
    onSuccess: () => {
      setGenerating(null);
      refetch();
    },
    onError: () => {
      setGenerating(null);
    },
  });

  const handleGenerateSpotify = () => {
    setGenerating("spotify");
    generateSpotify.mutate({ roundId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListMusic className="size-5" />
            Playlists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading playlist info...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyPlaylist = links?.spotify || links?.apple;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListMusic className="size-5" />
          Playlists
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Spotify playlist */}
        {links?.spotify ? (
          <a
            href={links.spotify.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <Music className="size-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Spotify Playlist</p>
              <p className="text-xs text-muted-foreground truncate">
                Open in Spotify
              </p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground shrink-0" />
          </a>
        ) : isAdmin ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Music className="size-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Spotify Playlist</p>
              <p className="text-xs text-muted-foreground">
                Not yet generated
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSpotify}
              disabled={generating === "spotify"}
            >
              {generating === "spotify" ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        ) : null}

        {/* Apple Music playlist */}
        {links?.apple ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Music className="size-5 text-rose-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Apple Music Playlist</p>
              <p className="text-xs text-muted-foreground">
                Added to your library
              </p>
            </div>
          </div>
        ) : null}

        {/* No playlists and not admin */}
        {!hasAnyPlaylist && !isAdmin && (
          <p className="text-sm text-muted-foreground">
            No playlists have been generated for this round yet. A league admin
            can generate playlists once the round is revealed.
          </p>
        )}

        {/* Error message */}
        {generateSpotify.error && (
          <p className="text-sm text-destructive">
            {generateSpotify.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
