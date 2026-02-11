"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Music, Users, Mic2, LayoutList, Vote, TrendingUp, Zap, Download } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeagueAnalytics({ leagueId }: { leagueId: string }) {
  const [seasonId, setSeasonId] = useState<string | undefined>(undefined);

  const { data: seasons } = trpc.season.list.useQuery({ leagueId });

  const { data: overview, isLoading: overviewLoading } =
    trpc.analytics.leagueOverview.useQuery({ leagueId, seasonId });

  const { data: leagueStats } = trpc.statistics.getLeagueStats.useQuery({
    leagueId,
    seasonId,
  });

  const { data: topArtists } = trpc.analytics.topArtists.useQuery({
    leagueId,
    seasonId,
    limit: 10,
  });

  const { data: topSongs } = trpc.analytics.topSongs.useQuery({
    leagueId,
    seasonId,
    limit: 10,
  });

  const { data: controversial } =
    trpc.statistics.getControversialSubmissions.useQuery({
      leagueId,
      seasonId,
      limit: 5,
    });

  const { refetch: fetchCsv } =
    trpc.statistics.exportLeaderboardCsv.useQuery(
      { leagueId, seasonId },
      { enabled: false }
    );

  const handleExport = useCallback(async () => {
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

  const avgPerRound =
    overview && overview.totalRounds > 0
      ? (overview.totalSubmissions / overview.totalRounds).toFixed(1)
      : "--";

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/leagues/${leagueId}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>
          {seasons && seasons.length > 0 && (
            <Select
              value={seasonId ?? "all"}
              onValueChange={(v) => setSeasonId(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Seasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Music className="size-5 text-muted-foreground" />
              {overviewLoading ? "..." : overview?.totalSubmissions ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Artists</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Mic2 className="size-5 text-muted-foreground" />
              {overviewLoading ? "..." : overview?.uniqueArtists ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submitters</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {overviewLoading ? "..." : overview?.uniqueSubmitters ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rounds</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LayoutList className="size-5 text-muted-foreground" />
              {overviewLoading ? "..." : overview?.totalRounds ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Enhanced stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg per Round</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="size-5 text-muted-foreground" />
              {avgPerRound}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Votes</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Vote className="size-5 text-muted-foreground" />
              {leagueStats?.totalVotesCast ?? "--"}
            </CardTitle>
          </CardHeader>
        </Card>
        {leagueStats?.mostActiveSubmitter && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Most Active</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="size-5 text-muted-foreground" />
                <span className="truncate">
                  {leagueStats.mostActiveSubmitter.name}
                </span>
                <Badge variant="outline" className="ml-auto shrink-0">
                  {leagueStats.mostActiveSubmitter.count}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Top Artists */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Top Artists</h2>
        {topArtists && topArtists.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left font-medium">Artist</th>
                  <th className="px-4 py-3 text-right font-medium">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {topArtists.map((row, i) => (
                  <tr key={row.artist} className="border-b last:border-0 transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">{row.artist}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.submissionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No submission data yet.</p>
        )}
      </div>

      {/* Top Songs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Top Songs</h2>
        <p className="text-xs text-muted-foreground">Songs submitted 2 or more times</p>
        {topSongs && topSongs.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left font-medium">Song</th>
                  <th className="px-4 py-3 text-left font-medium">Artist</th>
                  <th className="px-4 py-3 text-right font-medium">Times Submitted</th>
                </tr>
              </thead>
              <tbody>
                {topSongs.map((row, i) => (
                  <tr key={`${row.trackName}-${row.artist}`} className="border-b last:border-0 transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">{row.trackName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.artist}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.submissionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No songs submitted more than once yet.</p>
        )}
      </div>

      {/* Most Controversial */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Most Controversial</h2>
        <p className="text-xs text-muted-foreground">
          Submissions with the most divided opinions (high upvotes and downvotes)
        </p>
        {controversial && controversial.length > 0 ? (
          <div className="space-y-2">
            {controversial.map((sub) => (
              <Card key={sub.submissionId}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {sub.trackName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sub.artist} &middot; {sub.roundTheme}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="default" className="tabular-nums">
                        +{sub.upvoteCount}
                      </Badge>
                      <Badge variant="outline" className="tabular-nums">
                        -{sub.downvoteCount}
                      </Badge>
                    </div>
                  </div>
                  {sub.userName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted by {sub.userName}
                    </p>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No controversial submissions found. Downvoting must be enabled to generate controversy data.
          </p>
        )}
      </div>
    </div>
  );
}
