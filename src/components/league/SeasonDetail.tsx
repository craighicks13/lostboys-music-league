"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Music,
  Users,
  LayoutList,
} from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonLeaderboard } from "./SeasonLeaderboard";

interface SeasonDetailProps {
  leagueId: string;
  seasonId: string;
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  upcoming: "outline",
  active: "default",
  completed: "secondary",
};

const roundStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  submitting: "default",
  voting: "secondary",
  revealed: "default",
  archived: "outline",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SeasonDetail({ leagueId, seasonId }: SeasonDetailProps) {
  const { data: season, isLoading: seasonLoading } =
    trpc.season.getById.useQuery({ id: seasonId }, { enabled: !!seasonId });

  const { data: league, isLoading: leagueLoading } =
    trpc.league.getById.useQuery({ id: leagueId }, { enabled: !!leagueId });

  const { data: rounds, isLoading: roundsLoading } =
    trpc.round.list.useQuery(
      { leagueId, seasonId },
      { enabled: !!leagueId && !!seasonId }
    );

  const { data: leaderboard } = trpc.season.getLeaderboard.useQuery(
    { seasonId },
    { enabled: !!seasonId }
  );

  const isLoading = seasonLoading || leagueLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!season || !league) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Season not found or you don&apos;t have access.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/leagues/${leagueId}`}>Back to League</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSubmissions =
    rounds?.reduce((sum, r) => sum + (r.submissionCount ?? 0), 0) ?? 0;
  const participantCount = leaderboard?.length ?? 0;
  const topScorer =
    leaderboard && leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/leagues/${leagueId}`}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to League
        </Link>
      </Button>

      {/* Season header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            {season.name}
          </h1>
          <Badge variant={statusBadgeVariant[season.status] ?? "outline"}>
            {season.status}
          </Badge>
        </div>
        {(season.startDate || season.endDate) && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(season.startDate)} &mdash; {formatDate(season.endDate)}
          </p>
        )}
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rounds</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LayoutList className="size-5 text-muted-foreground" />
              {rounds?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Music className="size-5 text-muted-foreground" />
              {totalSubmissions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participants</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {participantCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Scorer</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="size-5 text-muted-foreground" />
              {topScorer ? (
                <span className="truncate">{topScorer.userName ?? "Unknown"}</span>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Leaderboard */}
      <SeasonLeaderboard leagueId={leagueId} seasonId={seasonId} />

      {/* Rounds list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Rounds</h2>
        {roundsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : rounds && rounds.length > 0 ? (
          <div className="space-y-2">
            {rounds.map((round) => (
              <Link
                key={round.id}
                href={`/leagues/${leagueId}/rounds/${round.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{round.theme}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {round.submissionCount} submissions
                        </span>
                        <Badge
                          variant={
                            roundStatusVariant[round.status] ?? "outline"
                          }
                        >
                          {round.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No rounds in this season yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
