"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Music, Ban, X } from "lucide-react";
import type { TrackMetadata } from "@/lib/services/music";
import type { SubmissionData } from "./SinglePickVoting";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";

interface RankVotingProps {
  submissions: SubmissionData[];
  currentUserId: string;
  allowSelfVote: boolean;
  downvotingEnabled: boolean;
  upvotePoints: number[];
  downvotePoints: number[];
  /** Ordered list of submission IDs, index 0 = rank #1 */
  rankedUpvotes: string[];
  /** Ordered list of submission IDs for bottom picks */
  rankedDownvotes: string[];
  onAddUpvoteRank: (submissionId: string) => void;
  onRemoveUpvoteRank: (submissionId: string) => void;
  onAddDownvoteRank: (submissionId: string) => void;
  onRemoveDownvoteRank: (submissionId: string) => void;
}

function buildTrack(sub: SubmissionData): TrackMetadata {
  return {
    provider: (sub.provider as "spotify" | "apple") ?? "spotify",
    providerTrackId: sub.providerTrackId ?? "",
    trackName: sub.trackName ?? "Unknown",
    artist: sub.artist ?? "Unknown",
    album: sub.album ?? "",
    artworkUrl: sub.artworkUrl ?? null,
    duration: sub.duration ?? 0,
    previewUrl: sub.previewUrl ?? null,
    providerUrl:
      sub.provider === "spotify"
        ? `https://open.spotify.com/track/${sub.providerTrackId}`
        : `https://music.apple.com/song/${sub.providerTrackId}`,
  };
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function RankVoting({
  submissions,
  currentUserId,
  allowSelfVote,
  downvotingEnabled,
  upvotePoints,
  downvotePoints,
  rankedUpvotes,
  rankedDownvotes,
  onAddUpvoteRank,
  onRemoveUpvoteRank,
  onAddDownvoteRank,
  onRemoveDownvoteRank,
}: RankVotingProps) {
  const maxUpvoteRanks = upvotePoints.length;
  const maxDownvoteRanks = downvotePoints.length;
  const upvoteRankSet = new Set(rankedUpvotes);
  const downvoteRankSet = new Set(rankedDownvotes);

  // Submissions available for ranking (not yet ranked, not self if disallowed)
  const availableForUpvote = submissions.filter((sub) => {
    if (sub.userId === currentUserId && !allowSelfVote) return false;
    if (upvoteRankSet.has(sub.id)) return false;
    if (downvoteRankSet.has(sub.id)) return false;
    return true;
  });

  const availableForDownvote = submissions.filter((sub) => {
    if (sub.userId === currentUserId && !allowSelfVote) return false;
    if (upvoteRankSet.has(sub.id)) return false;
    if (downvoteRankSet.has(sub.id)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Ranked picks section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          Rank your top {maxUpvoteRanks} picks
        </h3>
        <p className="text-xs text-muted-foreground">
          Click submissions below to add them to your ranked list.{" "}
          {rankedUpvotes.length}/{maxUpvoteRanks} selected.
        </p>
      </div>

      {/* Current rankings */}
      {rankedUpvotes.length > 0 && (
        <div className="space-y-2">
          {rankedUpvotes.map((subId, index) => {
            const sub = submissions.find((s) => s.id === subId);
            if (!sub) return null;
            const pts = upvotePoints[index] ?? 0;

            return (
              <div
                key={`ranked-${subId}`}
                className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-900 dark:bg-green-950/20"
              >
                <Badge className="bg-green-600 text-white shrink-0">
                  {ordinalSuffix(index + 1)}
                </Badge>
                {sub.artworkUrl ? (
                  <Image
                    src={sub.artworkUrl}
                    alt={sub.trackName ?? ""}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                    <Music className="size-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sub.trackName ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {sub.artist ?? "Unknown"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {pts}pts
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => onRemoveUpvoteRank(subId)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Available submissions to rank */}
      {rankedUpvotes.length < maxUpvoteRanks && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableForUpvote.map((sub) => {
            const isSelf = sub.userId === currentUserId;
            const track = buildTrack(sub);

            return (
              <Card
                key={sub.id}
                className="cursor-pointer transition-all hover:border-green-300 dark:hover:border-green-800"
                onClick={() => onAddUpvoteRank(sub.id)}
              >
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
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
                      {sub.userName ?? "Anonymous"}
                    </span>
                    {isSelf && (
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Already-ranked submissions shown as disabled cards when all slots filled */}
      {rankedUpvotes.length >= maxUpvoteRanks && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {submissions.map((sub) => {
            const isSelf = sub.userId === currentUserId;
            const isDisabled = isSelf && !allowSelfVote;
            const isRankedUp = upvoteRankSet.has(sub.id);
            const isRankedDown = downvoteRankSet.has(sub.id);
            const rankIndex = rankedUpvotes.indexOf(sub.id);

            return (
              <Card
                key={sub.id}
                className={`transition-all ${
                  isRankedUp
                    ? "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20"
                    : isRankedDown
                    ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20"
                    : isDisabled
                    ? "opacity-50"
                    : "opacity-60"
                }`}
              >
                <CardContent className="flex items-center gap-3 pt-4">
                  {sub.artworkUrl ? (
                    <Image
                      src={sub.artworkUrl}
                      alt={sub.trackName ?? ""}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                      <Music className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sub.trackName ?? "Unknown"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.artist ?? "Unknown"}
                    </p>
                  </div>
                  {isRankedUp && (
                    <Badge className="bg-green-600 text-white">
                      {ordinalSuffix(rankIndex + 1)} — {upvotePoints[rankIndex]}pts
                    </Badge>
                  )}
                  {isDisabled && !isRankedUp && (
                    <Ban className="size-3.5 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom picks section */}
      {downvotingEnabled && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-red-600">
              Bottom picks (optional)
            </h3>
            <p className="text-xs text-muted-foreground">
              Select up to {maxDownvoteRanks} submission{maxDownvoteRanks > 1 ? "s" : ""} for negative
              points. {rankedDownvotes.length}/{maxDownvoteRanks} selected.
            </p>
          </div>

          {/* Current bottom rankings */}
          {rankedDownvotes.length > 0 && (
            <div className="space-y-2">
              {rankedDownvotes.map((subId, index) => {
                const sub = submissions.find((s) => s.id === subId);
                if (!sub) return null;
                const pts = downvotePoints[index] ?? 0;

                return (
                  <div
                    key={`bottom-${subId}`}
                    className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 dark:border-red-900 dark:bg-red-950/20"
                  >
                    <Badge variant="destructive" className="shrink-0">
                      Bottom {index + 1}
                    </Badge>
                    {sub.artworkUrl ? (
                      <Image
                        src={sub.artworkUrl}
                        alt={sub.trackName ?? ""}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                        <Music className="size-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {sub.trackName ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sub.artist ?? "Unknown"}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {pts}pts
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => onRemoveDownvoteRank(subId)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available submissions for bottom picks */}
          {rankedDownvotes.length < maxDownvoteRanks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableForDownvote.map((sub) => (
                <Card
                  key={`down-avail-${sub.id}`}
                  className="cursor-pointer transition-all hover:border-red-300 dark:hover:border-red-800"
                  onClick={() => onAddDownvoteRank(sub.id)}
                >
                  <CardContent className="flex items-center gap-3 pt-4">
                    {sub.artworkUrl ? (
                      <Image
                        src={sub.artworkUrl}
                        alt={sub.trackName ?? ""}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                        <Music className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {sub.trackName ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sub.artist ?? "Unknown"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
