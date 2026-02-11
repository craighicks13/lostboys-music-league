"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import type { TrackMetadata } from "@/lib/services/music";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";
import { SubmissionForm } from "./SubmissionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MySubmissionProps {
  leagueId: string;
  roundId: string;
  roundStatus: string;
  submissionDeadline?: Date | null;
}

export function MySubmission({
  leagueId,
  roundId,
  roundStatus,
  submissionDeadline,
}: MySubmissionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: submission, isLoading } =
    trpc.submission.getMySubmission.useQuery({ roundId });

  const deleteSubmission = trpc.submission.delete.useMutation({
    onSuccess: () => {
      toast.success("Submission deleted");
      utils.submission.getMySubmission.invalidate({ roundId });
      utils.submission.getByRound.invalidate({ roundId });
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading || !submission) {
    return null;
  }

  const canModify =
    roundStatus === "submitting" &&
    (!submissionDeadline || submissionDeadline > new Date());

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit Your Submission</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
        <SubmissionForm
          leagueId={leagueId}
          roundId={roundId}
          existingSubmission={submission}
          onSuccess={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const track: TrackMetadata = {
    provider: submission.provider as "spotify" | "apple",
    providerTrackId: submission.providerTrackId,
    trackName: submission.trackName,
    artist: submission.artist,
    album: submission.album ?? "",
    artworkUrl: submission.artworkUrl,
    duration: submission.duration ?? 0,
    previewUrl: submission.previewUrl,
    providerUrl:
      submission.provider === "spotify"
        ? `https://open.spotify.com/track/${submission.providerTrackId}`
        : `https://music.apple.com/song/${submission.providerTrackId}`,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your Submission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <TrackPreview track={track} />

        <div className="flex items-center gap-2">
          <OpenInProvider
            provider={track.provider}
            providerTrackId={track.providerTrackId}
            providerUrl={track.providerUrl}
          />
        </div>

        {submission.note && (
          <div className="bg-muted rounded-md p-3">
            <p className="text-muted-foreground text-xs font-medium mb-1">
              Your note
            </p>
            <p className="text-sm">{submission.note}</p>
          </div>
        )}

        {canModify && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4 mr-1.5" />
              Edit Note
            </Button>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-4 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your submission? You can
                    submit a new track afterwards.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() =>
                      deleteSubmission.mutate({ id: submission.id })
                    }
                  >
                    {deleteSubmission.isPending
                      ? "Deleting..."
                      : "Yes, Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
