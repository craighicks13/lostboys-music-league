"use client";

import { Trophy, Award } from "lucide-react";
import { trpc } from "@/app/providers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonLeaderboardProps {
  leagueId: string;
  seasonId?: string | null;
}

function rankAccent(rank: number) {
  switch (rank) {
    case 1:
      return "text-yellow-500";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-amber-700";
    default:
      return "text-muted-foreground";
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SeasonLeaderboard({
  seasonId,
}: SeasonLeaderboardProps) {
  const { data: leaderboard, isLoading } = trpc.season.getLeaderboard.useQuery(
    { seasonId: seasonId! },
    { enabled: !!seasonId }
  );

  const { data: season } = trpc.season.getById.useQuery(
    { id: seasonId! },
    { enabled: !!seasonId }
  );

  const isCompleted = season?.status === "completed";

  if (!seasonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Select a season to view its leaderboard
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leaderboard</CardTitle>
          {isCompleted && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Award className="size-3" />
              Final Standings
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !leaderboard || leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No leaderboard data yet
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50"
                >
                  {/* Rank */}
                  <div className={`flex items-center justify-center w-8 shrink-0 font-bold ${rankAccent(rank)}`}>
                    {isTopThree ? (
                      <Trophy className="size-5" />
                    ) : (
                      <span className="text-sm">{rank}</span>
                    )}
                  </div>

                  {/* Avatar + Name */}
                  <Avatar>
                    {entry.userImage && (
                      <AvatarImage
                        src={entry.userImage}
                        alt={entry.userName ?? ""}
                      />
                    )}
                    <AvatarFallback>
                      {(entry.userName ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isTopThree ? rankAccent(rank) : ""}`}>
                      {entry.userName ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.wins} {entry.wins === 1 ? "win" : "wins"} &middot;{" "}
                      {entry.roundsParticipated}{" "}
                      {entry.roundsParticipated === 1 ? "round" : "rounds"}
                    </p>
                  </div>

                  {/* Points */}
                  <Badge variant={isTopThree ? "default" : "outline"}>
                    {entry.totalPoints} pts
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
