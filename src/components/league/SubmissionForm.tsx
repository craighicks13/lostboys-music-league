"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import type { TrackMetadata } from "@/lib/services/music";
import { TrackPreview } from "./TrackPreview";
import { OpenInProvider } from "./OpenInProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface SubmissionFormProps {
  leagueId: string;
  roundId: string;
  existingSubmission?: {
    id: string;
    provider: string;
    providerTrackId: string;
    trackName: string;
    artist: string;
    album: string | null;
    artworkUrl: string | null;
    duration: number | null;
    previewUrl: string | null;
    note: string | null;
  };
  onSuccess?: () => void;
}

export function SubmissionForm({
  roundId,
  existingSubmission,
  onSuccess,
}: SubmissionFormProps) {
  const isEditMode = !!existingSubmission;

  const [url, setUrl] = useState("");
  const [note, setNote] = useState(existingSubmission?.note ?? "");
  const [track, setTrack] = useState<TrackMetadata | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const utils = trpc.useUtils();

  const createSubmission = trpc.submission.create.useMutation({
    onSuccess: () => {
      toast.success("Song submitted");
      utils.submission.getMySubmission.invalidate({ roundId });
      utils.submission.getByRound.invalidate({ roundId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSubmission = trpc.submission.update.useMutation({
    onSuccess: () => {
      toast.success("Note updated");
      utils.submission.getMySubmission.invalidate({ roundId });
      utils.submission.getByRound.invalidate({ roundId });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleLookup() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setLookupError(null);
    setTrack(null);
    setIsLookingUp(true);

    try {
      const result = await utils.music.lookupByUrl.fetch({ url: trimmedUrl });
      setTrack(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to look up track";
      if (message.includes("Unrecognized")) {
        setLookupError(
          "Unrecognized URL. Please paste a Spotify or Apple Music track link."
        );
      } else {
        setLookupError(message);
      }
    } finally {
      setIsLookingUp(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLookup();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEditMode && existingSubmission) {
      updateSubmission.mutate({
        id: existingSubmission.id,
        note: note.trim() || undefined,
      });
      return;
    }

    if (!track) return;

    createSubmission.mutate({
      roundId,
      provider: track.provider,
      providerTrackId: track.providerTrackId,
      trackName: track.trackName,
      artist: track.artist,
      album: track.album || undefined,
      artworkUrl: track.artworkUrl,
      duration: track.duration,
      previewUrl: track.previewUrl,
      note: note.trim() || undefined,
    });
  }

  const isPending = createSubmission.isPending || updateSubmission.isPending;
  const mutationError = createSubmission.error || updateSubmission.error;

  // Build a TrackMetadata-like object from the existing submission for preview
  const existingTrack: TrackMetadata | null = existingSubmission
    ? {
        provider: existingSubmission.provider as "spotify" | "apple",
        providerTrackId: existingSubmission.providerTrackId,
        trackName: existingSubmission.trackName,
        artist: existingSubmission.artist,
        album: existingSubmission.album ?? "",
        artworkUrl: existingSubmission.artworkUrl,
        duration: existingSubmission.duration ?? 0,
        previewUrl: existingSubmission.previewUrl,
        providerUrl:
          existingSubmission.provider === "spotify"
            ? `https://open.spotify.com/track/${existingSubmission.providerTrackId}`
            : `https://music.apple.com/song/${existingSubmission.providerTrackId}`,
      }
    : null;

  const displayTrack = isEditMode ? existingTrack : track;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="track-url">Track URL</Label>
              <div className="flex gap-2">
                <Input
                  id="track-url"
                  placeholder="Paste a Spotify or Apple Music link..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLookingUp}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleLookup}
                  disabled={isLookingUp || !url.trim()}
                  aria-label="Look up track"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {lookupError && (
                <p className="text-sm text-red-500">{lookupError}</p>
              )}
            </div>
          )}

          {displayTrack && (
            <div className="space-y-2">
              <TrackPreview track={displayTrack} />
              <OpenInProvider
                provider={displayTrack.provider}
                providerTrackId={displayTrack.providerTrackId}
                providerUrl={displayTrack.providerUrl}
              />
            </div>
          )}

          {(displayTrack || isEditMode) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="submission-note">
                  Why I picked this...{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="submission-note"
                  placeholder="Share why you chose this track..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-muted-foreground text-right text-xs">
                  {note.length}/500
                </p>
              </div>

              {mutationError && (
                <p className="text-sm text-red-500">
                  {mutationError.message}
                </p>
              )}

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending
                  ? isEditMode
                    ? "Updating..."
                    : "Submitting..."
                  : isEditMode
                    ? "Update Note"
                    : "Submit"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
