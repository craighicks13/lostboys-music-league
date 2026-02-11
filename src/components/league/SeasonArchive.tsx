"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Hash, Plus, Trash2, CalendarDays } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { CreateSeasonForm } from "./CreateSeasonForm";

function formatDateRange(
  startDate: Date | null,
  endDate: Date | null
): string | null {
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

export function SeasonArchive() {
  const { id } = useParams<{ id: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const {
    data: league,
    isLoading: leagueLoading,
    error: leagueError,
  } = trpc.league.getById.useQuery({ id }, { enabled: !!id });

  const {
    data: seasons,
    isLoading: seasonsLoading,
    error: seasonsError,
  } = trpc.season.list.useQuery({ leagueId: id }, { enabled: !!id });

  const updateStatus = trpc.season.updateStatus.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate();
      utils.season.getActive.invalidate();
    },
  });

  const deleteSeason = trpc.season.delete.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate();
      utils.season.getActive.invalidate();
      setDeleteId(null);
    },
  });

  const isLoading = leagueLoading || seasonsLoading;
  const error = leagueError || seasonsError;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error?.message ?? "League not found or you don\u0027t have access."}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/leagues">Back to My Leagues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnerOrAdmin =
    league.userRole === "owner" || league.userRole === "admin";
  const hasSeasons = seasons && seasons.length > 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/leagues/${id}`}>
              <ArrowLeft className="size-5" />
              <span className="sr-only">Back to league</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Seasons</h1>
            <p className="text-sm text-muted-foreground">{league.name}</p>
          </div>
        </div>
        {isOwnerOrAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Create Season
          </Button>
        )}
      </div>

      {/* Season List */}
      {!hasSeasons ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarDays}
              title="No seasons yet"
              description="Seasons organize your rounds into groups. Create your first season to get started."
              action={
                isOwnerOrAdmin ? (
                  <Button variant="outline" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4 mr-1.5" />
                    Create Season
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => {
            const dateRange = formatDateRange(
              season.startDate,
              season.endDate
            );

            return (
              <Card key={season.id}>
                <CardContent className="py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Season info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-sm"
                      >
                        <Hash className="size-3 mr-0.5" />
                        {season.number}
                      </Badge>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-medium truncate">
                            {season.name}
                          </span>
                          <Badge
                            variant={statusBadgeVariant(season.status)}
                            className={statusBadgeClassName(season.status)}
                          >
                            {season.status}
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
                            {season.roundCount}{" "}
                            {season.roundCount === 1 ? "round" : "rounds"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions for owner/admin */}
                    {isOwnerOrAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        {season.status === "upcoming" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: season.id,
                                status: "active",
                              })
                            }
                          >
                            Activate
                          </Button>
                        )}
                        {season.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: season.id,
                                status: "completed",
                              })
                            }
                          >
                            Complete
                          </Button>
                        )}
                        {season.roundCount === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(season.id)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete season</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Season Dialog */}
      <CreateSeasonForm
        leagueId={id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this season? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteSeason.isPending}
              onClick={() => {
                if (deleteId) {
                  deleteSeason.mutate({ id: deleteId });
                }
              }}
            >
              {deleteSeason.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
