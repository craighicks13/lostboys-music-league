"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import type { TrackMetadata } from "@/lib/services/music";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shuffle, Music } from "lucide-react";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";
import { AudioPlayerProvider } from "./AudioPlayerContext";
import { EmptyState } from "@/components/EmptyState";
import { VotingPanel } from "./VotingPanel";
import { ResultsView } from "./ResultsView";
import { ReactionBar } from "./ReactionBar";
import { CommentThread } from "./CommentThread";

interface SubmissionFeedProps {
  roundId: string;
  leagueId?: string;
  roundStatus: string;
  currentUserId?: string;
  userRole?: string;
}

export function SubmissionFeed({
  roundId,
  leagueId,
  roundStatus,
  currentUserId,
  userRole,
}: SubmissionFeedProps) {
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<NonNullable<typeof allSubmissions>>([]);

  const canFetch =
    roundStatus === "voting" ||
    roundStatus === "revealed" ||
    roundStatus === "archived";

  const { data: allSubmissions, isLoading } =
    trpc.submission.getByRound.useQuery({ roundId }, { enabled: canFetch });

  function handleShuffle() {
    if (!isShuffled && allSubmissions) {
      const shuffled = [...allSubmissions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setShuffledOrder(shuffled);
    }
    setIsShuffled(!isShuffled);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!allSubmissions || allSubmissions.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Music}
            title="No submissions yet"
            description="No one has submitted a song for this round yet. Submissions will appear here once the round is underway."
          />
        </CardContent>
      </Card>
    );
  }

  // During voting phase, render VotingPanel instead of read-only grid
  if (roundStatus === "voting" && currentUserId && leagueId) {
    return (
      <VotingPanel
        roundId={roundId}
        leagueId={leagueId}
        submissions={allSubmissions}
        currentUserId={currentUserId}
      />
    );
  }

  // For revealed/archived rounds, show ranked results
  if (
    (roundStatus === "revealed" || roundStatus === "archived") &&
    leagueId
  ) {
    return (
      <ResultsView
        roundId={roundId}
        leagueId={leagueId}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    );
  }

  const displaySubmissions = isShuffled ? shuffledOrder : allSubmissions;

  return (
    <AudioPlayerProvider>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Submissions ({allSubmissions.length})
        </h2>
        <Button
          variant={isShuffled ? "default" : "outline"}
          size="sm"
          onClick={handleShuffle}
          aria-label={isShuffled ? "Show original order" : "Shuffle submissions"}
        >
          <Shuffle className="size-4 mr-1.5" />
          {isShuffled ? "Shuffled" : "Shuffle"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displaySubmissions.map((sub) => {
          const isCurrentUser = sub.userId === currentUserId;
          const isAnonymous = sub.userName === null;
          const track: TrackMetadata = {
            provider: sub.provider as "spotify" | "apple",
            providerTrackId: sub.providerTrackId,
            trackName: sub.trackName,
            artist: sub.artist,
            album: sub.album ?? "",
            artworkUrl: sub.artworkUrl,
            duration: sub.duration ?? 0,
            previewUrl: sub.previewUrl,
            providerUrl:
              sub.provider === "spotify"
                ? `https://open.spotify.com/track/${sub.providerTrackId}`
                : `https://music.apple.com/song/${sub.providerTrackId}`,
          };

          return (
            <Card
              key={sub.id}
              className={
                isCurrentUser
                  ? "border-primary/40 bg-primary/5"
                  : undefined
              }
            >
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  {isAnonymous ? (
                    <>
                      <Avatar size="sm">
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground italic">
                        Anonymous
                      </span>
                    </>
                  ) : (
                    <>
                      <Avatar size="sm">
                        {sub.userImage && (
                          <AvatarImage
                            src={sub.userImage}
                            alt={sub.userName ?? ""}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {(sub.userName ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {sub.userName}
                      </span>
                    </>
                  )}
                  {isCurrentUser && !isAnonymous && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>

                <TrackPreview track={track} />

                <OpenInProvider
                  provider={track.provider}
                  providerTrackId={track.providerTrackId}
                  providerUrl={track.providerUrl}
                />

                {sub.note && (
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-sm">{sub.note}</p>
                  </div>
                )}

                <ReactionBar submissionId={sub.id} />
                <CommentThread
                  submissionId={sub.id}
                  userRole={userRole}
                  currentUserId={currentUserId}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AudioPlayerProvider>
  );
}
