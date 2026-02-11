"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Music, ThumbsUp, ThumbsDown, Ban } from "lucide-react";
import type { TrackMetadata } from "@/lib/services/music";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";

export interface SubmissionData {
  id: string;
  userId: string;
  trackName: string | null;
  artist: string | null;
  album: string | null;
  artworkUrl: string | null;
  duration: number | null;
  provider: string | null;
  providerTrackId: string | null;
  previewUrl: string | null;
  note: string | null;
  userName: string | null;
  userImage: string | null;
}

interface SinglePickVotingProps {
  submissions: SubmissionData[];
  currentUserId: string;
  allowSelfVote: boolean;
  downvotingEnabled: boolean;
  selectedUpvote: string | null;
  selectedDownvote: string | null;
  onSelectUpvote: (submissionId: string | null) => void;
  onSelectDownvote: (submissionId: string | null) => void;
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

export function SinglePickVoting({
  submissions,
  currentUserId,
  allowSelfVote,
  downvotingEnabled,
  selectedUpvote,
  selectedDownvote,
  onSelectUpvote,
  onSelectDownvote,
}: SinglePickVotingProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          <ThumbsUp className="mr-1.5 inline size-4 text-green-600" />
          Pick your favorite
        </h3>
        <p className="text-xs text-muted-foreground">
          Select one submission as your top pick
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {submissions.map((sub) => {
          const isSelf = sub.userId === currentUserId;
          const isDisabled = isSelf && !allowSelfVote;
          const isUpvoted = selectedUpvote === sub.id;
          const isDownvoted = selectedDownvote === sub.id;
          const track = buildTrack(sub);

          return (
            <Card
              key={sub.id}
              className={`relative cursor-pointer transition-all ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : isUpvoted
                  ? "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20"
                  : isDownvoted
                  ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20"
                  : "hover:border-foreground/20"
              }`}
              onClick={() => {
                if (isDisabled) return;
                if (isUpvoted) {
                  onSelectUpvote(null);
                } else {
                  if (isDownvoted) onSelectDownvote(null);
                  onSelectUpvote(sub.id);
                }
              }}
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

                {/* Selection indicator */}
                {isUpvoted && (
                  <Badge className="bg-green-600 text-white">
                    <ThumbsUp className="mr-1 size-3" />
                    +1
                  </Badge>
                )}
                {isDownvoted && (
                  <Badge variant="destructive">
                    <ThumbsDown className="mr-1 size-3" />
                    -1
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {downvotingEnabled && (
        <>
          <div className="space-y-1 pt-4">
            <h3 className="text-sm font-medium">
              <ThumbsDown className="mr-1.5 inline size-4 text-red-600" />
              Pick your least favorite
            </h3>
            <p className="text-xs text-muted-foreground">
              Optionally select one submission as your least favorite
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {submissions.map((sub) => {
              const isSelf = sub.userId === currentUserId;
              const isDisabled =
                (isSelf && !allowSelfVote) || selectedUpvote === sub.id;
              const isDownvoted = selectedDownvote === sub.id;

              return (
                <Card
                  key={`down-${sub.id}`}
                  className={`relative cursor-pointer transition-all ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : isDownvoted
                      ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : "hover:border-foreground/20"
                  }`}
                  onClick={() => {
                    if (isDisabled) return;
                    if (isDownvoted) {
                      onSelectDownvote(null);
                    } else {
                      onSelectDownvote(sub.id);
                    }
                  }}
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
                    {isDownvoted && (
                      <Badge variant="destructive">
                        <ThumbsDown className="mr-1 size-3" />
                        -1
                      </Badge>
                    )}
                    {selectedUpvote === sub.id && (
                      <Badge variant="secondary" className="text-xs">
                        Your pick
                      </Badge>
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
