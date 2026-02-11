"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface VoteEntry {
  submissionId: string;
  trackName: string | null;
  artist: string | null;
  points: number;
  voteType: "upvote" | "downvote";
}

interface VoteConfirmationProps {
  votes: VoteEntry[];
  onEdit: () => void;
}

export function VoteConfirmation({ votes, onEdit }: VoteConfirmationProps) {
  const upvotes = votes
    .filter((v) => v.voteType === "upvote")
    .sort((a, b) => b.points - a.points);
  const downvotes = votes.filter((v) => v.voteType === "downvote");

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-5" />
          <span className="font-semibold">Votes submitted!</span>
        </div>

        {upvotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Your picks
            </p>
            {upvotes.map((vote) => (
              <div
                key={vote.submissionId}
                className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {vote.trackName ?? "Unknown track"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {vote.artist ?? "Unknown artist"}
                  </p>
                </div>
                <Badge className="bg-green-600 text-white">
                  +{vote.points}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {downvotes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Downvotes
              </p>
              {downvotes.map((vote) => (
                <div
                  key={vote.submissionId}
                  className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {vote.trackName ?? "Unknown track"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {vote.artist ?? "Unknown artist"}
                    </p>
                  </div>
                  <Badge variant="destructive">{vote.points}</Badge>
                </div>
              ))}
            </div>
          </>
        )}

        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit Votes
        </Button>
      </CardContent>
    </Card>
  );
}
