"use client";

import Link from "next/link";
import { ArrowLeft, Trophy, TrendingUp, Hash, ThumbsUp, Music, Flame } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface UserStatsPageProps {
  leagueId: string;
  userId: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-xl" />
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-md" />
      ))}
    </div>
  );
}

export function UserStatsPage({ leagueId, userId }: UserStatsPageProps) {
  const { data, isLoading } = trpc.statistics.getUserDetailedStats.useQuery({
    leagueId,
    userId,
  });

  // Derive totals from submission history
  const totalPoints = data?.submissionHistory?.reduce((s, e) => s + e.pointsEarned, 0) ?? 0;
  const totalWins = data?.submissionHistory?.filter((e) => e.placement === 1).length ?? 0;
  const totalSubmissions = data?.submissionHistory?.length ?? 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/leagues/${leagueId}/leaderboards`}>
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Player Stats</h1>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <StatsSkeleton />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Total Points"
              value={totalPoints}
              icon={Trophy}
            />
            <StatCard
              label="Wins"
              value={totalWins}
              icon={Trophy}
            />
            <StatCard
              label="Avg Placement"
              value={data.avgPlacement != null ? `#${data.avgPlacement.toFixed(1)}` : "--"}
              icon={TrendingUp}
            />
            <StatCard
              label="Best Placement"
              value={data.bestPlacement != null ? `#${data.bestPlacement}` : "--"}
              icon={TrendingUp}
            />
            <StatCard
              label="Worst Placement"
              value={data.worstPlacement != null ? `#${data.worstPlacement}` : "--"}
              icon={Hash}
            />
            <StatCard
              label="Win Streak"
              value={data.winStreak}
              icon={Flame}
            />
            <StatCard
              label="Votes Cast"
              value={data.totalVotesCast}
              icon={ThumbsUp}
            />
            <StatCard
              label="Submissions"
              value={totalSubmissions}
              icon={Music}
            />
          </div>

          {/* Favorite Genres */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Favorite Genres</h2>
            {data.favoriteGenres && data.favoriteGenres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.favoriteGenres.slice(0, 10).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-sm">
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No genre data yet.</p>
            )}
          </div>

          {/* Submission History */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Submission History</h2>
            {data.submissionHistory && data.submissionHistory.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Theme</th>
                        <th className="px-4 py-3 text-left font-medium">Track</th>
                        <th className="px-4 py-3 text-left font-medium">Artist</th>
                        <th className="px-4 py-3 text-right font-medium">Placement</th>
                        <th className="px-4 py-3 text-right font-medium">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.submissionHistory.map((entry) => (
                        <tr key={entry.roundId} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <Link
                              href={`/leagues/${leagueId}/rounds/${entry.roundId}`}
                              className="hover:underline"
                            >
                              {entry.theme}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{entry.trackName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.artist}</td>
                          <td className={cn(
                            "px-4 py-3 text-right tabular-nums font-medium",
                            entry.placement === 1 && "text-yellow-500"
                          )}>
                            {entry.placement != null ? `#${entry.placement}` : "--"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.pointsEarned}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y rounded-md border">
                  {data.submissionHistory.map((entry) => (
                    <div key={entry.roundId} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/leagues/${leagueId}/rounds/${entry.roundId}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {entry.theme}
                        </Link>
                        <Badge
                          variant={entry.placement === 1 ? "default" : "outline"}
                          className="shrink-0 ml-2"
                        >
                          {entry.placement != null ? `#${entry.placement}` : "--"} &middot; {entry.pointsEarned} pts
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.trackName} &mdash; {entry.artist}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No stats available for this player.</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Submission History</h2>
          <HistorySkeleton />
        </div>
      )}
    </div>
  );
}
