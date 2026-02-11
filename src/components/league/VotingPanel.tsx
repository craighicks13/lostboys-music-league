"use client";

import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioPlayerProvider } from "./AudioPlayerContext";
import { SinglePickVoting } from "./SinglePickVoting";
import { PointsVoting } from "./PointsVoting";
import { RankVoting } from "./RankVoting";
import { VoteConfirmation } from "./VoteConfirmation";
import type { SubmissionData } from "./SinglePickVoting";
import type { LeagueSettings } from "@/lib/validators/league";
import { toast } from "sonner";

interface VotingPanelProps {
  roundId: string;
  leagueId: string;
  submissions: SubmissionData[];
  currentUserId: string;
}

export function VotingPanel({
  roundId,
  leagueId,
  submissions,
  currentUserId,
}: VotingPanelProps) {
  const utils = trpc.useUtils();

  // Fetch league settings
  const { data: league, isLoading: leagueLoading } =
    trpc.league.getById.useQuery({ id: leagueId });

  // Fetch existing votes
  const { data: existingVotes, isLoading: votesLoading } =
    trpc.voting.getMyVotes.useQuery({ roundId });

  // Cast votes mutation
  const castVotes = trpc.voting.castVotes.useMutation({
    onSuccess: () => {
      toast.success("Votes submitted");
      utils.voting.getMyVotes.invalidate({ roundId });
      setShowConfirmation(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // UI state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);

  // SinglePick state
  const [selectedUpvote, setSelectedUpvote] = useState<string | null>(null);
  const [selectedDownvote, setSelectedDownvote] = useState<string | null>(null);

  // Points state
  const [upvoteAssignments, setUpvoteAssignments] = useState<
    Record<string, number>
  >({});
  const [downvoteAssignments, setDownvoteAssignments] = useState<
    Record<string, number>
  >({});

  // Rank state
  const [rankedUpvotes, setRankedUpvotes] = useState<string[]>([]);
  const [rankedDownvotes, setRankedDownvotes] = useState<string[]>([]);

  const settings: LeagueSettings = (league?.settings as LeagueSettings) ?? {
    anonymousSubmissions: false,
    allowSelfVote: false,
    downvotingEnabled: false,
    votingStyle: "points",
    maxUpvotes: 3,
    maxDownvotes: 1,
    upvotePoints: [3, 2, 1],
    downvotePoints: [-1],
  };

  // Hydrate state from existing votes
  useEffect(() => {
    if (!existingVotes || existingVotes.length === 0) return;

    if (settings.votingStyle === "single_pick") {
      const up = existingVotes.find((v) => v.voteType === "upvote");
      const down = existingVotes.find((v) => v.voteType === "downvote");
      if (up) setSelectedUpvote(up.submissionId);
      if (down) setSelectedDownvote(down.submissionId);
      setShowConfirmation(true);
    } else if (settings.votingStyle === "points") {
      const upAssign: Record<string, number> = {};
      const downAssign: Record<string, number> = {};
      for (const v of existingVotes) {
        if (v.voteType === "upvote") {
          upAssign[v.submissionId] = v.points;
        } else {
          downAssign[v.submissionId] = v.points;
        }
      }
      setUpvoteAssignments(upAssign);
      setDownvoteAssignments(downAssign);
      setShowConfirmation(true);
    } else if (settings.votingStyle === "rank") {
      const ups = existingVotes
        .filter((v) => v.voteType === "upvote")
        .sort((a, b) => b.points - a.points)
        .map((v) => v.submissionId);
      const downs = existingVotes
        .filter((v) => v.voteType === "downvote")
        .sort((a, b) => a.points - b.points)
        .map((v) => v.submissionId);
      setRankedUpvotes(ups);
      setRankedDownvotes(downs);
      setShowConfirmation(true);
    }
  }, [existingVotes, settings.votingStyle]);

  // Build votes payload from current state
  const buildVotesPayload = useCallback(() => {
    const votes: Array<{
      submissionId: string;
      points: number;
      voteType: "upvote" | "downvote";
    }> = [];

    if (settings.votingStyle === "single_pick") {
      if (selectedUpvote) {
        votes.push({
          submissionId: selectedUpvote,
          points: 1,
          voteType: "upvote",
        });
      }
      if (selectedDownvote) {
        votes.push({
          submissionId: selectedDownvote,
          points: -1,
          voteType: "downvote",
        });
      }
    } else if (settings.votingStyle === "points") {
      for (const [subId, pts] of Object.entries(upvoteAssignments)) {
        votes.push({ submissionId: subId, points: pts, voteType: "upvote" });
      }
      for (const [subId, pts] of Object.entries(downvoteAssignments)) {
        votes.push({
          submissionId: subId,
          points: pts,
          voteType: "downvote",
        });
      }
    } else if (settings.votingStyle === "rank") {
      rankedUpvotes.forEach((subId, index) => {
        const pts = settings.upvotePoints[index] ?? 0;
        votes.push({ submissionId: subId, points: pts, voteType: "upvote" });
      });
      rankedDownvotes.forEach((subId, index) => {
        const pts = settings.downvotePoints[index] ?? 0;
        votes.push({
          submissionId: subId,
          points: pts,
          voteType: "downvote",
        });
      });
    }

    return votes;
  }, [
    settings.votingStyle,
    settings.upvotePoints,
    settings.downvotePoints,
    selectedUpvote,
    selectedDownvote,
    upvoteAssignments,
    downvoteAssignments,
    rankedUpvotes,
    rankedDownvotes,
  ]);

  // Check if submit is valid
  const isSubmitValid = useCallback(() => {
    if (settings.votingStyle === "single_pick") {
      return selectedUpvote !== null;
    }
    if (settings.votingStyle === "points") {
      return Object.keys(upvoteAssignments).length > 0;
    }
    if (settings.votingStyle === "rank") {
      return rankedUpvotes.length > 0;
    }
    return false;
  }, [
    settings.votingStyle,
    selectedUpvote,
    upvoteAssignments,
    rankedUpvotes,
  ]);

  function handleSubmit() {
    const votes = buildVotesPayload();
    castVotes.mutate({ roundId, votes });
  }

  function handleEdit() {
    setShowConfirmation(false);
  }

  // Build confirmation vote entries
  function buildConfirmationEntries() {
    const payload = buildVotesPayload();
    return payload.map((v) => {
      const sub = submissions.find((s) => s.id === v.submissionId);
      return {
        submissionId: v.submissionId,
        trackName: sub?.trackName ?? null,
        artist: sub?.artist ?? null,
        points: v.points,
        voteType: v.voteType,
      };
    });
  }

  if (leagueLoading || votesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 pt-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <VoteConfirmation votes={buildConfirmationEntries()} onEdit={handleEdit} />
    );
  }

  return (
    <AudioPlayerProvider>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)]">Cast Your Votes</h2>

        {settings.votingStyle === "single_pick" && (
          <SinglePickVoting
            submissions={submissions}
            currentUserId={currentUserId}
            allowSelfVote={settings.allowSelfVote}
            downvotingEnabled={settings.downvotingEnabled}
            selectedUpvote={selectedUpvote}
            selectedDownvote={selectedDownvote}
            onSelectUpvote={setSelectedUpvote}
            onSelectDownvote={setSelectedDownvote}
          />
        )}

        {settings.votingStyle === "points" && (
          <PointsVoting
            submissions={submissions}
            currentUserId={currentUserId}
            allowSelfVote={settings.allowSelfVote}
            downvotingEnabled={settings.downvotingEnabled}
            upvotePoints={settings.upvotePoints}
            downvotePoints={settings.downvotePoints}
            upvoteAssignments={upvoteAssignments}
            downvoteAssignments={downvoteAssignments}
            onAssignUpvote={(subId, pts) =>
              setUpvoteAssignments((prev) => ({ ...prev, [subId]: pts }))
            }
            onRemoveUpvote={(subId) =>
              setUpvoteAssignments((prev) => {
                const next = { ...prev };
                delete next[subId];
                return next;
              })
            }
            onAssignDownvote={(subId, pts) =>
              setDownvoteAssignments((prev) => ({ ...prev, [subId]: pts }))
            }
            onRemoveDownvote={(subId) =>
              setDownvoteAssignments((prev) => {
                const next = { ...prev };
                delete next[subId];
                return next;
              })
            }
          />
        )}

        {settings.votingStyle === "rank" && (
          <RankVoting
            submissions={submissions}
            currentUserId={currentUserId}
            allowSelfVote={settings.allowSelfVote}
            downvotingEnabled={settings.downvotingEnabled}
            upvotePoints={settings.upvotePoints}
            downvotePoints={settings.downvotePoints}
            rankedUpvotes={rankedUpvotes}
            rankedDownvotes={rankedDownvotes}
            onAddUpvoteRank={(subId) => {
              if (rankedUpvotes.length < settings.upvotePoints.length) {
                setRankedUpvotes((prev) => [...prev, subId]);
              }
            }}
            onRemoveUpvoteRank={(subId) =>
              setRankedUpvotes((prev) => prev.filter((id) => id !== subId))
            }
            onAddDownvoteRank={(subId) => {
              if (rankedDownvotes.length < settings.downvotePoints.length) {
                setRankedDownvotes((prev) => [...prev, subId]);
              }
            }}
            onRemoveDownvoteRank={(subId) =>
              setRankedDownvotes((prev) => prev.filter((id) => id !== subId))
            }
          />
        )}

        {/* Submit button */}
        <div className="sticky bottom-20 sm:bottom-0 z-10 flex justify-end pt-2 pb-2">
          <Button
            onClick={handleSubmit}
            disabled={!isSubmitValid() || castVotes.isPending}
            className={`shadow-lg sm:shadow-none gradient-primary text-white hover:opacity-90 ${isHoveringSubmit ? "glow-primary" : ""}`}
            onMouseEnter={() => setIsHoveringSubmit(true)}
            onMouseLeave={() => setIsHoveringSubmit(false)}
          >
            {castVotes.isPending ? "Submitting..." : "Submit Votes"}
          </Button>
        </div>

        {castVotes.isError && (
          <p className="text-sm text-destructive">
            {castVotes.error?.message ?? "Failed to submit votes. Try again."}
          </p>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
