"use client";

import { trpc } from "@/app/providers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ModerationLogProps {
  leagueId: string;
}

function actionBadge(action: string) {
  switch (action) {
    case "kick":
      return <Badge variant="destructive">Kick</Badge>;
    case "ban":
      return <Badge className="bg-red-700 text-white">Ban</Badge>;
    case "unban":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Unban</Badge>;
    case "role_change":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Role Change</Badge>;
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
}

export function ModerationLog({ leagueId }: ModerationLogProps) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.league.getModerationLog.useInfiniteQuery(
    { leagueId, limit: 25 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No moderation actions yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="divide-y rounded-md border">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 p-3">
            <Avatar className="size-8">
              {entry.performerImage && (
                <AvatarImage
                  src={entry.performerImage}
                  alt={entry.performerName ?? ""}
                />
              )}
              <AvatarFallback className="text-xs">
                {(entry.performerName ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-medium">{entry.performerName}</span>
                {actionBadge(entry.action)}
                <span className="text-muted-foreground">{entry.targetName}</span>
              </div>

              {entry.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reason: {entry.reason}
                </p>
              )}

              {entry.action === "role_change" && entry.metadata != null ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(entry.metadata as Record<string, string>).oldRole} →{" "}
                  {(entry.metadata as Record<string, string>).newRole}
                </p>
              ) : null}

              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
