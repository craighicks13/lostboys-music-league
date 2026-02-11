"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateSeasonFormProps {
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSeasonForm({
  leagueId,
  open,
  onOpenChange,
}: CreateSeasonFormProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createSeason = trpc.season.create.useMutation({
    onSuccess: () => {
      toast.success("Season created");
      utils.season.list.invalidate();
      utils.season.getActive.invalidate();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function resetForm() {
    setName("");
    setStartDate("");
    setEndDate("");
    setValidationError(null);
    createSeason.reset();
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 1) {
      setValidationError("Season name is required");
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError("Season name must be 100 characters or fewer");
      return;
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setValidationError("End date must be after start date");
      return;
    }

    createSeason.mutate({
      leagueId,
      name: trimmedName,
      startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
      endDate: endDate ? `${endDate}T00:00:00.000Z` : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        resetForm();
      }
      onOpenChange(value);
    }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Season</DialogTitle>
            <DialogDescription>
              Start a new season for your league. Seasons organize rounds and
              track standings over time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="season-name">Season Name</Label>
              <Input
                id="season-name"
                placeholder="Season 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {(validationError || createSeason.error) && (
            <p className="pb-4 text-sm text-red-500">
              {validationError ?? createSeason.error?.message}
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
            <Button type="submit" disabled={createSeason.isPending}>
              {createSeason.isPending ? "Creating..." : "Create Season"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
