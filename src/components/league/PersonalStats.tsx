"use client";

import {
  Trophy,
  Medal,
  Target,
  Music,
  ThumbsUp,
  ThumbsDown,
  Hash,
  Star,
} from "lucide-react";
import { trpc } from "@/app/providers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PersonalStatsProps {
  leagueId: string;
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

export function PersonalStats({ leagueId }: PersonalStatsProps) {
  const { data, isLoading } = trpc.league.getPersonalStats.useQuery({
    leagueId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your Stats</h2>
        <StatsSkeleton />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your Stats</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Season Rank"
          value={data.seasonRank != null ? `#${data.seasonRank}` : "--"}
          icon={Medal}
        />
        <StatCard
          label="All-Time Rank"
          value={data.allTimeRank != null ? `#${data.allTimeRank}` : "--"}
          icon={Trophy}
        />
        <StatCard label="Total Points" value={data.totalPoints} icon={Star} />
        <StatCard label="Wins" value={data.wins} icon={Target} />
        <StatCard
          label="Rounds Played"
          value={data.roundsPlayed}
          icon={Hash}
        />
        <StatCard
          label="Submissions"
          value={data.totalSubmissions}
          icon={Music}
        />
        <StatCard
          label="Upvotes Received"
          value={data.upvotesReceived}
          icon={ThumbsUp}
        />
        <StatCard
          label="Downvotes Received"
          value={data.downvotesReceived}
          icon={ThumbsDown}
        />
      </div>
    </div>
  );
}
