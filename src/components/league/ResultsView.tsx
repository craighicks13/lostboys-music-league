"use client";

import { trpc } from "@/app/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, ThumbsUp, ThumbsDown } from "lucide-react";
import type { TrackMetadata } from "@/lib/services/music";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";
import { AudioPlayerProvider } from "./AudioPlayerContext";
import { ReactionBar } from "./ReactionBar";
import { CommentThread } from "./CommentThread";

interface ResultsViewProps {
  roundId: string;
  leagueId: string;
  userRole?: string;
  currentUserId?: string;
}

export function ResultsView({ roundId, leagueId, userRole, currentUserId }: ResultsViewProps) {
  const { data: results, isLoading } = trpc.voting.getResults.useQuery({
    roundId,
  });
  const { data: league } = trpc.league.getById.useQuery({ id: leagueId });

  const settings = league?.settings as
    | { downvotingEnabled?: boolean }
    | undefined;
  const downvotingEnabled = settings?.downvotingEnabled ?? false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No results for this round.</p>
        </CardContent>
      </Card>
    );
  }

  // Assign positions (handle ties — same points = same position)
  const positions: number[] = [];
  for (let i = 0; i < results.length; i++) {
    if (i === 0) {
      positions.push(1);
    } else if (results[i].totalPoints === results[i - 1].totalPoints) {
      positions.push(positions[i - 1]);
    } else {
      positions.push(i + 1);
    }
  }

  return (
    <AudioPlayerProvider>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Results</h2>

        <div className="space-y-3">
          {results.map((result, index) => {
            const position = positions[index];
            const isWinner = position === 1;
            const track: TrackMetadata = {
              provider:
                (result.provider as "spotify" | "apple") ?? "spotify",
              providerTrackId: result.providerTrackId ?? "",
              trackName: result.trackName ?? "Unknown",
              artist: result.artist ?? "Unknown",
              album: result.album ?? "",
              artworkUrl: result.artworkUrl ?? null,
              duration: result.duration ?? 0,
              previewUrl: result.previewUrl ?? null,
              providerUrl:
                result.provider === "spotify"
                  ? `https://open.spotify.com/track/${result.providerTrackId}`
                  : `https://music.apple.com/song/${result.providerTrackId}`,
            };

            return (
              <Card
                key={result.id}
                className={
                  isWinner
                    ? "border-yellow-400 bg-yellow-50/50 dark:border-yellow-600 dark:bg-yellow-950/20 ring-2 ring-yellow-400/50 glow-primary shadow-lg shadow-yellow-500/20 dark:shadow-yellow-500/10"
                    : undefined
                }
              >
                <CardContent className="space-y-3 pt-4">
                  {/* Position + user info row */}
                  <div className="flex items-center gap-3">
                    {/* Position badge */}
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                        isWinner
                          ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900"
                          : position === 2
                          ? "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 dark:from-gray-500 dark:to-gray-700 dark:text-gray-100"
                          : position === 3
                          ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {position}
                    </div>

                    {/* User info */}
                    <Avatar className="size-6">
                      {result.userImage && (
                        <AvatarImage
                          src={result.userImage}
                          alt={result.userName ?? ""}
                        />
                      )}
                      <AvatarFallback className="text-xs">
                        {(result.userName ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {result.userName ?? "Unknown"}
                    </span>

                    {isWinner && (
                      <span className="inline-flex animate-pulse-glow rounded-full p-1">
                        <Trophy className="size-4 text-yellow-500" />
                      </span>
                    )}

                    {/* Score badges */}
                    <div className="ml-auto flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="font-bold text-sm"
                      >
                        {result.totalPoints} pts
                      </Badge>
                    </div>
                  </div>

                  {/* Vote breakdown */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="size-3 text-green-600" />
                      {result.upvoteCount} upvote
                      {result.upvoteCount !== 1 ? "s" : ""}
                    </span>
                    {downvotingEnabled && (
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="size-3 text-red-600" />
                        {result.downvoteCount} downvote
                        {result.downvoteCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Track preview */}
                  <TrackPreview track={track} />

                  <OpenInProvider
                    provider={track.provider}
                    providerTrackId={track.providerTrackId}
                    providerUrl={track.providerUrl}
                  />

                  {result.note && (
                    <div className="bg-muted rounded-md p-3">
                      <p className="text-sm">{result.note}</p>
                    </div>
                  )}

                  <ReactionBar submissionId={result.id} />
                  <CommentThread
                    submissionId={result.id}
                    userRole={userRole}
                    currentUserId={currentUserId}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AudioPlayerProvider>
  );
}
