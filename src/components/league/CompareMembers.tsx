"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CompareMembersProps {
  leagueId: string;
}

function ComparisonBar({
  label,
  value1,
  value2,
  format,
  lowerIsBetter = false,
}: {
  label: string;
  value1: number;
  value2: number;
  format?: (v: number) => string;
  lowerIsBetter?: boolean;
}) {
  const fmt = format ?? ((v: number) => String(v));
  const max = Math.max(value1, value2, 1);
  const pct1 = (value1 / max) * 100;
  const pct2 = (value2 / max) * 100;

  const winner = lowerIsBetter
    ? value1 < value2 ? 1 : value2 < value1 ? 2 : 0
    : value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={cn("tabular-nums font-medium", winner === 1 && "text-foreground")}>
          {fmt(value1)}
        </span>
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums font-medium", winner === 2 && "text-foreground")}>
          {fmt(value2)}
        </span>
      </div>
      <div className="flex items-center gap-1 h-3">
        {/* Left bar (grows from right) */}
        <div className="flex-1 flex justify-end">
          <div
            className={cn(
              "h-full rounded-l-sm transition-all",
              winner === 1 ? "bg-primary" : "bg-muted"
            )}
            style={{ width: `${pct1}%` }}
          />
        </div>
        {/* Right bar (grows from left) */}
        <div className="flex-1">
          <div
            className={cn(
              "h-full rounded-r-sm transition-all",
              winner === 2 ? "bg-primary" : "bg-muted"
            )}
            style={{ width: `${pct2}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function CompareMembers({ leagueId }: CompareMembersProps) {
  const [userId1, setUserId1] = useState<string | null>(null);
  const [userId2, setUserId2] = useState<string | null>(null);

  const { data: members, isLoading: membersLoading } =
    trpc.league.getMembers.useQuery({ leagueId });

  const { data: comparison, isLoading: comparisonLoading } =
    trpc.statistics.getComparativeStats.useQuery(
      { leagueId, userId1: userId1!, userId2: userId2! },
      { enabled: !!userId1 && !!userId2 }
    );

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
        <h1 className="text-2xl font-bold">Compare Members</h1>
      </div>

      {/* Member Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {membersLoading ? (
          <>
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </>
        ) : (
          <>
            <Select
              value={userId1 ?? undefined}
              onValueChange={setUserId1}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Player 1" />
              </SelectTrigger>
              <SelectContent>
                {members
                  ?.filter((m) => m.userId !== userId2)
                  .map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name ?? "Unknown"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={userId2 ?? undefined}
              onValueChange={setUserId2}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Player 2" />
              </SelectTrigger>
              <SelectContent>
                {members
                  ?.filter((m) => m.userId !== userId1)
                  .map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name ?? "Unknown"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Comparison Content */}
      {!userId1 || !userId2 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Select two members to compare
            </p>
          </CardContent>
        </Card>
      ) : comparisonLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : comparison ? (
        <>
          {/* Player Headers */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <Avatar className="size-10">
                  {comparison.user1.userImage && (
                    <AvatarImage
                      src={comparison.user1.userImage}
                      alt={comparison.user1.userName ?? ""}
                    />
                  )}
                  <AvatarFallback>
                    {(comparison.user1.userName ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {comparison.user1.userName ?? "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <Avatar className="size-10">
                  {comparison.user2.userImage && (
                    <AvatarImage
                      src={comparison.user2.userImage}
                      alt={comparison.user2.userName ?? ""}
                    />
                  )}
                  <AvatarFallback>
                    {(comparison.user2.userName ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {comparison.user2.userName ?? "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stat Comparisons */}
          <Card>
            <CardHeader>
              <CardTitle>Stats Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComparisonBar
                label="Total Points"
                value1={comparison.user1.totalPoints}
                value2={comparison.user2.totalPoints}
              />
              <ComparisonBar
                label="Wins"
                value1={comparison.user1.wins}
                value2={comparison.user2.wins}
              />
              <ComparisonBar
                label="Avg Placement"
                value1={comparison.user1.avgPlacement ?? 0}
                value2={comparison.user2.avgPlacement ?? 0}
                format={(v) => v > 0 ? `#${v.toFixed(1)}` : "--"}
                lowerIsBetter
              />
              <ComparisonBar
                label="Rounds Played"
                value1={comparison.user1.roundsPlayed}
                value2={comparison.user2.roundsPlayed}
              />
              <ComparisonBar
                label="Upvotes Received"
                value1={comparison.user1.upvotesReceived}
                value2={comparison.user2.upvotesReceived}
              />
              <ComparisonBar
                label="Downvotes Received"
                value1={comparison.user1.downvotesReceived}
                value2={comparison.user2.downvotesReceived}
                lowerIsBetter
              />
            </CardContent>
          </Card>

          {/* Head to Head */}
          <Card>
            <CardHeader>
              <CardTitle>Head to Head</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 text-center gap-4">
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {comparison.headToHead.user1Wins}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {comparison.user1.userName ?? "Player 1"} Wins
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold tabular-nums text-muted-foreground">
                    {comparison.headToHead.ties}
                  </p>
                  <p className="text-xs text-muted-foreground">Ties</p>
                </div>
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {comparison.headToHead.user2Wins}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {comparison.user2.userName ?? "Player 2"} Wins
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Based on {comparison.headToHead.commonRounds} common{" "}
                {comparison.headToHead.commonRounds === 1 ? "round" : "rounds"}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
