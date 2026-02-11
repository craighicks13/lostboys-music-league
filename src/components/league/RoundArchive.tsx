"use client";

import Link from "next/link";
import { Calendar, LayoutList } from "lucide-react";
import { trpc } from "@/app/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

type RoundStatus = "draft" | "submitting" | "voting" | "revealed" | "archived";

function statusBadgeVariant(status: RoundStatus) {
  switch (status) {
    case "draft":
      return "outline" as const;
    case "submitting":
      return "default" as const;
    case "voting":
      return "secondary" as const;
    case "revealed":
      return "default" as const;
    case "archived":
      return "outline" as const;
  }
}

function statusBadgeClassName(status: RoundStatus) {
  switch (status) {
    case "submitting":
      return "bg-green-600 text-white";
    case "voting":
      return "";
    case "revealed":
      return "bg-blue-600 text-white";
    case "draft":
      return "border-yellow-500 text-yellow-600 dark:text-yellow-400";
    case "archived":
      return "";
  }
}

function formatDateRange(
  start: Date | null,
  end: Date | null
): string | null {
  if (!start && !end) return null;

  const fmt = (date: Date, includeYear: boolean) => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
    };
    return new Date(date).toLocaleDateString("en-US", options);
  };

  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const sameYear = s.getFullYear() === e.getFullYear();
    return `${fmt(s, !sameYear)} - ${fmt(e, true)}`;
  }

  if (start) return `Starts ${fmt(new Date(start), true)}`;
  return `Ends ${fmt(new Date(end!), true)}`;
}

interface RoundArchiveProps {
  leagueId: string;
  seasonId?: string | null;
}

export function RoundArchive({ leagueId, seasonId }: RoundArchiveProps) {
  const {
    data: rounds,
    isLoading,
    error,
  } = trpc.round.list.useQuery({
    leagueId,
    seasonId: seasonId ?? undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={LayoutList}
            title="No rounds yet"
            description="Rounds will appear here once they are created for this season."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const dateRange = formatDateRange(
          round.submissionStart,
          round.votingEnd
        );

        return (
          <Link
            key={round.id}
            href={`/leagues/${leagueId}/rounds/${round.id}`}
            className="block"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-medium truncate">
                        {round.theme}
                      </span>
                      <Badge
                        variant={statusBadgeVariant(round.status as RoundStatus)}
                        className={statusBadgeClassName(round.status as RoundStatus)}
                      >
                        {round.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      {dateRange && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 shrink-0" />
                          {dateRange}
                        </span>
                      )}
                      <span>
                        {round.submissionCount}{" "}
                        {round.submissionCount === 1
                          ? "submission"
                          : "submissions"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
