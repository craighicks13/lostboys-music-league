"use client";

import Link from "next/link";
import { ArrowLeft, Users, Music, LayoutList, Trophy, TrendingUp } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonStatsPageProps {
  leagueId: string;
  seasonId: string;
}

export function SeasonStatsPage({ leagueId, seasonId }: SeasonStatsPageProps) {
  const { data: season } = trpc.season.getById.useQuery({ id: seasonId });

  const { data: stats, isLoading } =
    trpc.statistics.getSeasonStats.useQuery({ seasonId });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/leagues/${leagueId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {season?.name ?? "Season"} Stats
          </h1>
          {season?.status && (
            <Badge variant={season.status === "active" ? "default" : "outline"}>
              {season.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rounds Played</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LayoutList className="size-5 text-muted-foreground" />
              {stats?.roundsPlayed ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participants</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {stats?.uniqueParticipants ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Music className="size-5 text-muted-foreground" />
              {stats?.totalSubmissions ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Current Leader */}
      {stats?.currentLeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="size-5 text-yellow-500" />
              <div>
                <CardTitle className="text-base">Current Leader</CardTitle>
                <CardDescription>
                  {stats.currentLeader.name} &middot;{" "}
                  {stats.currentLeader.points} points
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Round Breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Round Breakdown</h2>
        {stats?.roundBreakdown && stats.roundBreakdown.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Theme</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Submissions</th>
                    <th className="px-4 py-3 text-left font-medium">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.roundBreakdown.map((round) => (
                    <tr key={round.roundId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/leagues/${leagueId}/rounds/${round.roundId}`}
                          className="hover:underline"
                        >
                          {round.theme}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{round.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {round.submissionCount}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {round.winnerName ?? "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {stats.roundBreakdown.map((round) => (
                <Card key={round.roundId}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/leagues/${leagueId}/rounds/${round.roundId}`}
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {round.theme}
                      </Link>
                      <Badge variant="outline" className="shrink-0">
                        {round.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{round.submissionCount} submissions</span>
                      {round.winnerName && (
                        <span className="flex items-center gap-1">
                          <Trophy className="size-3" />
                          {round.winnerName}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No rounds completed in this season yet.
          </p>
        )}
      </div>

      {/* Participation Trend */}
      {stats?.roundBreakdown && stats.roundBreakdown.length > 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="size-5" />
            Participation Trend
          </h2>
          <div className="flex items-end gap-1 h-32 p-4 rounded-md border bg-muted/30">
            {stats.roundBreakdown.map((round) => {
              const max = Math.max(
                ...stats.roundBreakdown.map((r) => r.submissionCount),
                1
              );
              const heightPct = (round.submissionCount / max) * 100;
              return (
                <div
                  key={round.roundId}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {round.submissionCount}
                  </span>
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 px-4">
            {stats.roundBreakdown.map((round, i) => (
              <div
                key={round.roundId}
                className="flex-1 text-center text-[10px] text-muted-foreground truncate"
              >
                R{i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${leagueId}/leaderboards`}>
            View Leaderboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${leagueId}/analytics`}>
            Full Analytics
          </Link>
        </Button>
      </div>
    </div>
  );
}
