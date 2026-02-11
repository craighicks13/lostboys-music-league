"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  Calendar,
  Users,
  ArrowLeft,
  Trash2,
  Play,
  Vote,
  Eye,
  Archive,
  CheckCircle2,
  Music,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ArtworkManager } from "./ArtworkManager";
import { PlaylistLinks } from "./PlaylistLinks";
import { SubmissionForm } from "./SubmissionForm";
import { MySubmission } from "./MySubmission";
import { SubmissionFeed } from "./SubmissionFeed";

interface RoundDetailProps {
  roundId: string;
}

const statusBadgeVariant: Record<string, "outline" | "default" | "secondary"> = {
  draft: "outline",
  submitting: "default",
  voting: "secondary",
  revealed: "default",
  archived: "outline",
};

const transitionLabels: Record<string, { label: string; icon: typeof Play }> = {
  draft: { label: "Start Submissions", icon: Play },
  submitting: { label: "Start Voting", icon: Vote },
  voting: { label: "Reveal Results", icon: Eye },
  revealed: { label: "Archive", icon: Archive },
};

const nextStatus: Record<string, string> = {
  draft: "submitting",
  submitting: "voting",
  voting: "revealed",
  revealed: "archived",
};

export function RoundDetail({ roundId }: RoundDetailProps) {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [cancelOpen, setCancelOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: round, isLoading, error } = trpc.round.getById.useQuery(
    { id: roundId },
    { enabled: !!roundId }
  );

  const { data: league } = trpc.league.getById.useQuery(
    { id: round?.leagueId ?? "" },
    { enabled: !!round?.leagueId }
  );

  const { data: mySubmission } = trpc.submission.getMySubmission.useQuery(
    { roundId },
    { enabled: !!round && round.status === "submitting" }
  );

  const showSubmissionsList =
    round?.status === "voting" ||
    round?.status === "revealed" ||
    round?.status === "archived";

  const updateStatus = trpc.round.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Round status updated");
      utils.round.getById.invalidate({ id: roundId });
      utils.round.list.invalidate();
      utils.round.getActive.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelRound = trpc.round.cancel.useMutation({
    onSuccess: () => {
      toast.success("Round cancelled");
      utils.round.list.invalidate();
      utils.round.getActive.invalidate();
      if (round) {
        router.push(`/leagues/${round.leagueId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Round not found or you don&apos;t have access.
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
    league?.userRole === "owner" || league?.userRole === "admin";
  const canTransition = isOwnerOrAdmin && nextStatus[round.status];
  const canCancel =
    isOwnerOrAdmin &&
    (round.status === "draft" || round.status === "submitting");
  const transition = transitionLabels[round.status];
  const currentUserId = sessionData?.user?.id;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/leagues/${round.leagueId}`}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to League
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{round.theme}</h1>
            <Badge variant={statusBadgeVariant[round.status] ?? "outline"}>
              {round.status}
            </Badge>
          </div>
          {round.description && (
            <p className="text-muted-foreground">{round.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canTransition && transition && (
            <Button
              size="sm"
              onClick={() =>
                updateStatus.mutate({
                  id: round.id,
                  status: nextStatus[round.status] as "submitting" | "voting" | "revealed" | "archived",
                })
              }
              disabled={updateStatus.isPending}
            >
              <transition.icon className="size-4 mr-1.5" />
              {transition.label}
            </Button>
          )}

          {canCancel && (
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-4 mr-1.5" />
                  Cancel Round
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Round</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this round and all its
                    submissions. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Round</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => cancelRound.mutate({ id: round.id })}
                  >
                    {cancelRound.isPending ? "Cancelling..." : "Yes, Cancel Round"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Separator />

      {/* Artwork */}
      <ArtworkManager
        roundId={round.id}
        leagueId={round.leagueId}
        theme={round.theme}
        currentArtworkUrl={round.aiArtworkUrl}
        isAdmin={isOwnerOrAdmin ?? false}
      />

      {/* Playlists — shown for revealed/archived rounds */}
      {(round.status === "revealed" || round.status === "archived") && (
        <PlaylistLinks roundId={round.id} isAdmin={isOwnerOrAdmin ?? false} />
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {round.submissionCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created By</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              {round.creator ? (
                <>
                  <Avatar className="size-6">
                    {round.creator.image && (
                      <AvatarImage
                        src={round.creator.image}
                        alt={round.creator.name ?? ""}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {(round.creator.name ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{round.creator.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl">
              <Badge
                variant={statusBadgeVariant[round.status] ?? "outline"}
                className="text-base"
              >
                {round.status}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Submission section — shown during "submitting" phase */}
      {round.status === "submitting" && (
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            {mySubmission ? (
              <>
                <CheckCircle2 className="size-5 text-green-500" />
                <h2 className="text-lg font-semibold">You&apos;ve submitted!</h2>
              </>
            ) : (
              <>
                <Music className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Submit your track below</h2>
              </>
            )}
          </div>

          {mySubmission ? (
            <MySubmission
              leagueId={round.leagueId}
              roundId={round.id}
              roundStatus={round.status}
              submissionDeadline={round.submissionEnd}
            />
          ) : (
            <SubmissionForm
              leagueId={round.leagueId}
              roundId={round.id}
            />
          )}
        </div>
      )}

      {/* All submissions — shown after submitting phase */}
      {showSubmissionsList && (
        <div className="space-y-4">
          <Separator />
          <SubmissionFeed
            roundId={round.id}
            leagueId={round.leagueId}
            roundStatus={round.status}
            currentUserId={currentUserId}
            userRole={league?.userRole}
          />
        </div>
      )}

      {/* Dates */}
      <CollapsibleSection title="Schedule" defaultOpen={false}>
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Submission Start</p>
                <p className="text-sm text-muted-foreground">
                  {round.submissionStart
                    ? new Date(round.submissionStart).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Submission End</p>
                <p className="text-sm text-muted-foreground">
                  {round.submissionEnd
                    ? new Date(round.submissionEnd).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Voting End</p>
                <p className="text-sm text-muted-foreground">
                  {round.votingEnd
                    ? new Date(round.votingEnd).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleSection>
    </div>
  );
}
