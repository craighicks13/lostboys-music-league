"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeSuggestion } from "./ThemeSuggestion";
import { toast } from "sonner";

interface CreateRoundFormProps {
  leagueId: string;
  seasonId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoundForm({
  leagueId,
  seasonId: defaultSeasonId,
  open,
  onOpenChange,
}: CreateRoundFormProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(defaultSeasonId ?? "");
  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [submissionStart, setSubmissionStart] = useState("");
  const [submissionEnd, setSubmissionEnd] = useState("");
  const [votingEnd, setVotingEnd] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: seasons } = trpc.season.list.useQuery(
    { leagueId },
    { enabled: open }
  );

  // Sync when the default prop changes (e.g. user picks a different season in the dashboard)
  useEffect(() => {
    if (defaultSeasonId) {
      setSelectedSeasonId(defaultSeasonId);
    }
  }, [defaultSeasonId]);

  const utils = trpc.useUtils();
  const createRound = trpc.round.create.useMutation({
    onSuccess: () => {
      toast.success("Round created");
      utils.round.list.invalidate();
      utils.round.getActive.invalidate();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function resetForm() {
    setSelectedSeasonId(defaultSeasonId ?? "");
    setTheme("");
    setDescription("");
    setSubmissionStart("");
    setSubmissionEnd("");
    setVotingEnd("");
    setValidationError(null);
    createRound.reset();
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!selectedSeasonId) {
      setValidationError("Please select a season first");
      return;
    }

    const trimmedTheme = theme.trim();
    if (!trimmedTheme || trimmedTheme.length < 1) {
      setValidationError("Theme is required");
      return;
    }
    if (trimmedTheme.length > 200) {
      setValidationError("Theme must be 200 characters or fewer");
      return;
    }

    if (submissionEnd && submissionStart && new Date(submissionEnd) <= new Date(submissionStart)) {
      setValidationError("Submission end date must be after submission start date");
      return;
    }

    if (votingEnd && submissionEnd && new Date(votingEnd) <= new Date(submissionEnd)) {
      setValidationError("Voting end date must be after submission end date");
      return;
    }

    createRound.mutate({
      leagueId,
      seasonId: selectedSeasonId,
      theme: trimmedTheme,
      description: description.trim() || undefined,
      submissionStart: submissionStart ? `${submissionStart}T00:00:00.000Z` : undefined,
      submissionEnd: submissionEnd ? `${submissionEnd}T00:00:00.000Z` : undefined,
      votingEnd: votingEnd ? `${votingEnd}T00:00:00.000Z` : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        resetForm();
      }
      onOpenChange(value);
    }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Round</DialogTitle>
            <DialogDescription>
              Create a new round for your league. Each round has a theme and
              a submission and voting period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="round-season">Season</Label>
              <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                <SelectTrigger id="round-season">
                  <SelectValue placeholder="Select a season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons?.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name} ({season.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ThemeSuggestion
              leagueId={leagueId}
              onSelectTheme={(t, d) => {
                setTheme(t);
                setDescription(d);
              }}
            />
            <div className="space-y-2">
              <Label htmlFor="round-theme">Theme</Label>
              <Input
                id="round-theme"
                placeholder="e.g., Best Road Trip Songs"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="round-description">Description</Label>
              <Textarea
                id="round-description"
                placeholder="Optional description for this round..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-start">Submission Start</Label>
              <Input
                id="submission-start"
                type="date"
                value={submissionStart}
                onChange={(e) => setSubmissionStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-end">Submission End</Label>
              <Input
                id="submission-end"
                type="date"
                value={submissionEnd}
                onChange={(e) => setSubmissionEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voting-end">Voting End</Label>
              <Input
                id="voting-end"
                type="date"
                value={votingEnd}
                onChange={(e) => setVotingEnd(e.target.value)}
              />
            </div>
          </div>
          {(validationError || createRound.error) && (
            <p className="pb-4 text-sm text-red-500">
              {validationError ?? createRound.error?.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRound.isPending}>
              {createRound.isPending ? "Creating..." : "Create Round"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
