"use client";

import { Plus, Calendar, Trophy } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SeasonSwitcherProps {
  leagueId: string;
  userRole: string;
  selectedSeasonId?: string | null;
  onSeasonChange?: (seasonId: string | null) => void;
  onCreateSeason?: () => void;
}

function formatDateRange(startDate: Date | null, endDate: Date | null): string | null {
  if (!startDate && !endDate) return null;

  const fmt = (date: Date, includeYear: boolean) => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
    };
    return new Date(date).toLocaleDateString("en-US", options);
  };

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sameYear = start.getFullYear() === end.getFullYear();
    return `${fmt(start, !sameYear)} - ${fmt(end, true)}`;
  }

  if (startDate) return `Starts ${fmt(new Date(startDate), true)}`;
  return `Ends ${fmt(new Date(endDate!), true)}`;
}

function statusBadgeVariant(status: "upcoming" | "active" | "completed") {
  switch (status) {
    case "active":
      return "default" as const;
    case "upcoming":
      return "outline" as const;
    case "completed":
      return "secondary" as const;
  }
}

function statusBadgeClassName(status: "upcoming" | "active" | "completed") {
  switch (status) {
    case "active":
      return "bg-green-600 text-white";
    case "upcoming":
      return "border-yellow-500 text-yellow-600 dark:text-yellow-400";
    case "completed":
      return "";
  }
}

export function SeasonSwitcher({
  leagueId,
  userRole,
  selectedSeasonId,
  onSeasonChange,
  onCreateSeason,
}: SeasonSwitcherProps) {
  const { data: seasons, isLoading } = trpc.season.list.useQuery({ leagueId });

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-muted-foreground" />
            Seasons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasSeasons = seasons && seasons.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-muted-foreground" />
            Seasons
          </CardTitle>
          {isOwnerOrAdmin && hasSeasons && (
            <Button variant="outline" size="sm" onClick={onCreateSeason}>
              <Plus className="size-4 mr-1.5" />
              Create Season
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasSeasons ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">No seasons yet</p>
            {isOwnerOrAdmin && (
              <Button variant="outline" size="sm" onClick={onCreateSeason}>
                <Plus className="size-4 mr-1.5" />
                Create Season
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {seasons.map((season) => {
              const isSelected = selectedSeasonId === season.id;
              const dateRange = formatDateRange(season.startDate, season.endDate);

              return (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => onSeasonChange?.(isSelected ? null : season.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent",
                    isSelected && "ring-2 ring-ring bg-accent"
                  )}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {season.name}
                    </span>
                    {dateRange && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3 shrink-0" />
                        {dateRange}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {season.roundCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {season.roundCount} {season.roundCount === 1 ? "round" : "rounds"}
                      </span>
                    )}
                    <Badge
                      variant={statusBadgeVariant(season.status)}
                      className={statusBadgeClassName(season.status)}
                    >
                      {season.status}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
