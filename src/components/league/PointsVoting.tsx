"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Music, Ban } from "lucide-react";
import type { TrackMetadata } from "@/lib/services/music";
import type { SubmissionData } from "./SinglePickVoting";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";

interface PointsVotingProps {
  submissions: SubmissionData[];
  currentUserId: string;
  allowSelfVote: boolean;
  downvotingEnabled: boolean;
  upvotePoints: number[];
  downvotePoints: number[];
  /** Map of submissionId -> assigned upvote points */
  upvoteAssignments: Record<string, number>;
  /** Map of submissionId -> assigned downvote points (negative) */
  downvoteAssignments: Record<string, number>;
  onAssignUpvote: (submissionId: string, points: number) => void;
  onRemoveUpvote: (submissionId: string) => void;
  onAssignDownvote: (submissionId: string, points: number) => void;
  onRemoveDownvote: (submissionId: string) => void;
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

export function PointsVoting({
  submissions,
  currentUserId,
  allowSelfVote,
  downvotingEnabled,
  upvotePoints,
  downvotePoints,
  upvoteAssignments,
  downvoteAssignments,
  onAssignUpvote,
  onRemoveUpvote,
  onAssignDownvote,
  onRemoveDownvote,
}: PointsVotingProps) {
  // Available point chips (not yet assigned)
  const usedUpvotePoints = new Set(Object.values(upvoteAssignments));
  const availableUpvotePoints = upvotePoints.filter(
    (p) => !usedUpvotePoints.has(p)
  );

  const usedDownvotePoints = new Set(Object.values(downvoteAssignments));
  const availableDownvotePoints = downvotePoints.filter(
    (p) => !usedDownvotePoints.has(p)
  );

  return (
    <div className="space-y-4">
      {/* Available points display */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Assign your points</h3>
        <p className="text-xs text-muted-foreground">
          Click a point value, then click a submission to assign it. Each value
          can only be used once.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">
            Available:
          </span>
          {availableUpvotePoints.length > 0 ? (
            availableUpvotePoints
              .sort((a, b) => b - a)
              .map((pts) => (
                <Badge
                  key={`avail-${pts}`}
                  className="bg-green-600 text-white text-sm px-3 py-1"
                >
                  +{pts}
                </Badge>
              ))
          ) : (
            <span className="text-xs text-muted-foreground italic">
              All points assigned
            </span>
          )}
        </div>
      </div>

      {/* Submission cards for upvotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {submissions.map((sub) => {
          const isSelf = sub.userId === currentUserId;
          const isDisabled = isSelf && !allowSelfVote;
          const assignedPoints = upvoteAssignments[sub.id];
          const hasUpvote = assignedPoints !== undefined;
          const hasDownvote = downvoteAssignments[sub.id] !== undefined;
          const track = buildTrack(sub);

          return (
            <Card
              key={sub.id}
              className={`relative transition-all ${
                isDisabled
                  ? "opacity-50"
                  : hasUpvote
                  ? "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20"
                  : ""
              }`}
            >
              <CardContent className="space-y-3 pt-4">
                {/* User info */}
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
                  {isDisabled && (
                    <Ban className="size-3.5 text-muted-foreground" />
                  )}
                  {/* Show assigned points badge */}
                  {hasUpvote && (
                    <Badge className="ml-auto bg-green-600 text-white">
                      +{assignedPoints}
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

                {/* Point assignment buttons */}
                {!isDisabled && (
                  <div className="flex flex-wrap items-center gap-2">
                    {hasUpvote ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveUpvote(sub.id)}
                        className="text-xs"
                      >
                        Remove points
                      </Button>
                    ) : (
                      availableUpvotePoints
                        .sort((a, b) => b - a)
                        .map((pts) => (
                          <Button
                            key={`assign-${sub.id}-${pts}`}
                            variant="outline"
                            size="sm"
                            className="text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                            onClick={() => onAssignUpvote(sub.id, pts)}
                            disabled={hasDownvote}
                          >
                            +{pts}
                          </Button>
                        ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Downvote section */}
      {downvotingEnabled && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-red-600">
              Downvote points (optional)
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">
                Available:
              </span>
              {availableDownvotePoints.length > 0 ? (
                availableDownvotePoints.map((pts) => (
                  <Badge key={`avail-down-${pts}`} variant="destructive" className="text-sm px-3 py-1">
                    {pts}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  All downvote points assigned
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {submissions.map((sub) => {
              const isSelf = sub.userId === currentUserId;
              const isDisabled =
                (isSelf && !allowSelfVote) ||
                upvoteAssignments[sub.id] !== undefined;
              const assignedDown = downvoteAssignments[sub.id];
              const hasDownvote = assignedDown !== undefined;

              return (
                <Card
                  key={`down-${sub.id}`}
                  className={`relative transition-all ${
                    isDisabled
                      ? "opacity-50"
                      : hasDownvote
                      ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : ""
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

                    {hasDownvote ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{assignedDown}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveDownvote(sub.id)}
                          className="text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      !isDisabled &&
                      availableDownvotePoints.map((pts) => (
                        <Button
                          key={`assign-down-${sub.id}-${pts}`}
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => onAssignDownvote(sub.id, pts)}
                        >
                          {pts}
                        </Button>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
