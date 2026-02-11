"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, ArrowLeftRight, Download, BarChart3 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { PersonalStats } from "@/components/league/PersonalStats";

interface LeaderboardPageProps {
  leagueId: string;
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

function rankLabel(rank: number) {
  switch (rank) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    default:
      return `${rank}`;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
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

type LeaderboardEntry = {
  id: string;
  userId: string;
  totalPoints: number;
  upvotesReceived: number;
  downvotesReceived: number;
  wins: number;
  roundsParticipated: number;
  userName: string | null;
  userImage: string | null;
};

function LeaderboardTable({
  entries,
  currentUserId,
  leagueId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  leagueId: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No results yet"
        description="Leaderboard data will appear here after rounds are completed and votes are tallied."
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="divide-y rounded-md border">
          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_5rem_4rem_4.5rem_4.5rem_5rem] items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Points</span>
            <span className="text-right">Wins</span>
            <span className="text-right">Rounds</span>
            <span className="text-right">Upvotes</span>
            <span className="text-right">Downvotes</span>
          </div>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;
            const isCurrentUser = entry.userId === currentUserId;

            return (
              <div
                key={entry.id}
                className={cn(
                  "grid grid-cols-[3rem_1fr_5rem_4rem_4.5rem_4.5rem_5rem] items-center gap-2 px-3 py-3 transition-colors hover:bg-accent/50",
                  isCurrentUser && "bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center font-bold",
                    rankAccent(rank)
                  )}
                >
                  {isTopThree ? (
                    <Trophy className="size-5" />
                  ) : (
                    <span className="text-sm">{rank}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="size-7">
                    {entry.userImage && (
                      <AvatarImage
                        src={entry.userImage}
                        alt={entry.userName ?? ""}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {(entry.userName ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/leagues/${leagueId}/members/${entry.userId}/stats`}
                    className={cn(
                      "text-sm font-medium truncate hover:underline",
                      isTopThree && rankAccent(rank),
                      isCurrentUser && "underline"
                    )}
                  >
                    {entry.userName ?? "Unknown"}
                  </Link>
                </div>

                <div className="text-right">
                  <Badge variant={isTopThree ? "default" : "outline"}>
                    {entry.totalPoints}
                  </Badge>
                </div>

                <span className="text-sm text-right tabular-nums">
                  {entry.wins}
                </span>
                <span className="text-sm text-right tabular-nums">
                  {entry.roundsParticipated}
                </span>
                <span className="text-sm text-right tabular-nums">
                  {entry.upvotesReceived}
                </span>
                <span className="text-sm text-right tabular-nums text-muted-foreground">
                  {entry.downvotesReceived}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile/tablet cards */}
      <div className="lg:hidden divide-y rounded-md border">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;
          const isCurrentUser = entry.userId === currentUserId;

          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 p-3 transition-colors hover:bg-accent/50",
                isCurrentUser && "bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 shrink-0 font-bold",
                  rankAccent(rank)
                )}
              >
                {isTopThree ? (
                  <Trophy className="size-5" />
                ) : (
                  <span className="text-sm">{rankLabel(rank)}</span>
                )}
              </div>

              <Avatar className="size-8">
                {entry.userImage && (
                  <AvatarImage
                    src={entry.userImage}
                    alt={entry.userName ?? ""}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {(entry.userName ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/leagues/${leagueId}/members/${entry.userId}/stats`}
                  className={cn(
                    "text-sm font-medium truncate block hover:underline",
                    isTopThree && rankAccent(rank),
                    isCurrentUser && "underline"
                  )}
                >
                  {entry.userName ?? "Unknown"}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {entry.wins} {entry.wins === 1 ? "win" : "wins"} &middot;{" "}
                  {entry.roundsParticipated}{" "}
                  {entry.roundsParticipated === 1 ? "round" : "rounds"}
                </p>
              </div>

              <Badge variant={isTopThree ? "default" : "outline"}>
                {entry.totalPoints} pts
              </Badge>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function LeaderboardPage({ leagueId }: LeaderboardPageProps) {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;

  const { data: seasons, isLoading: seasonsLoading } =
    trpc.season.list.useQuery({ leagueId });

  const activeSeason = seasons?.find((s) => s.status === "active");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Default to active season once loaded
  const effectiveSeasonId =
    selectedSeasonId ?? activeSeason?.id ?? seasons?.[0]?.id ?? null;

  const {
    data: seasonLeaderboard,
    isLoading: seasonLoading,
  } = trpc.season.getLeaderboard.useQuery(
    { seasonId: effectiveSeasonId! },
    { enabled: !!effectiveSeasonId }
  );

  const {
    data: allTimeLeaderboard,
    isLoading: allTimeLoading,
  } = trpc.league.getAllTimeLeaderboard.useQuery({ leagueId });

  const { refetch: fetchCsv } =
    trpc.statistics.exportLeaderboardCsv.useQuery(
      { leagueId, seasonId: effectiveSeasonId ?? undefined },
      { enabled: false }
    );

  const handleExportCsv = useCallback(async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [fetchCsv]);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/leagues/${leagueId}`}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="size-4 mr-1.5" />
            Export
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/leagues/${leagueId}/compare`}>
              <ArrowLeftRight className="size-4 mr-1.5" />
              Compare
            </Link>
          </Button>
        </div>
      </div>

      <PersonalStats leagueId={leagueId} />

      <Tabs defaultValue="season">
        <TabsList>
          <TabsTrigger value="season">Season</TabsTrigger>
          <TabsTrigger value="all-time">All-Time</TabsTrigger>
        </TabsList>

        {/* Season leaderboard */}
        <TabsContent value="season">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Season Leaderboard</CardTitle>
                {seasonsLoading ? (
                  <Skeleton className="h-9 w-40" />
                ) : seasons && seasons.length > 0 ? (
                  <Select
                    value={effectiveSeasonId ?? undefined}
                    onValueChange={setSelectedSeasonId}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name}
                          {season.status === "active" ? " (Active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!effectiveSeasonId ? (
                <EmptyState
                  icon={Trophy}
                  title="No seasons available"
                  description="Create a season to start tracking standings."
                />
              ) : seasonLoading ? (
                <LoadingSkeleton />
              ) : (
                <LeaderboardTable
                  entries={seasonLeaderboard ?? []}
                  currentUserId={currentUserId}
                  leagueId={leagueId}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All-time leaderboard */}
        <TabsContent value="all-time">
          <Card>
            <CardHeader>
              <CardTitle>All-Time Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {allTimeLoading ? (
                <LoadingSkeleton />
              ) : (
                <LeaderboardTable
                  entries={allTimeLeaderboard ?? []}
                  currentUserId={currentUserId}
                  leagueId={leagueId}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
