"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Settings, UserPlus, Users, Trophy, LayoutList, Plus, Search, BarChart3, ArrowLeftRight, ExternalLink, MessageCircle, Music } from "lucide-react";
import { trpc } from "@/app/providers";
import type { LeagueSettings } from "@/lib/validators/league";
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
import { EmptyState } from "@/components/EmptyState";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { MembersList } from "./MembersList";
import { InviteManager } from "./InviteManager";
import { SeasonSwitcher } from "./SeasonSwitcher";
import { CreateSeasonForm } from "./CreateSeasonForm";
import { CreateRoundForm } from "./CreateRoundForm";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  submitting: "default",
  voting: "secondary",
  revealed: "default",
  archived: "outline",
};

export function LeagueDashboard() {
  const { id } = useParams<{ id: string }>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createSeasonOpen, setCreateSeasonOpen] = useState(false);
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const { data: league, isLoading, error } = trpc.league.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  const { data: activeSeason } = trpc.season.getActive.useQuery(
    { leagueId: id },
    { enabled: !!id }
  );

  const { data: seasons } = trpc.season.list.useQuery(
    { leagueId: id },
    { enabled: !!id }
  );

  const hasSeasons = seasons && seasons.length > 0;

  const { data: activeRound } = trpc.round.getActive.useQuery(
    { leagueId: id },
    { enabled: !!id }
  );

  const { data: recentRounds } = trpc.round.list.useQuery(
    { leagueId: id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              League not found or you don&apos;t have access.
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

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">{league.name}</h1>
            <Badge variant={league.visibility === "public" ? "secondary" : "outline"}>
              {league.visibility}
            </Badge>
          </div>
          {league.description && (
            <p className="text-muted-foreground">{league.description}</p>
          )}
        </div>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4 mr-1.5" />
              Invite Members
            </Button>
            <InviteManager leagueId={id} open={inviteOpen} onOpenChange={setInviteOpen} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/leagues/${id}/settings`}>
                <Settings className="size-4 mr-1.5" />
                Settings
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${id}/search`}>
            <Search className="size-3.5 mr-1.5" />
            Search
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${id}/analytics`}>
            <BarChart3 className="size-3.5 mr-1.5" />
            Analytics
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${id}/leaderboards`}>
            <Trophy className="size-3.5 mr-1.5" />
            Leaderboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${id}/compare`}>
            <ArrowLeftRight className="size-3.5 mr-1.5" />
            Compare
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/leagues/${id}/chat`}>
            <MessageCircle className="size-3.5 mr-1.5" />
            Chat
          </Link>
        </Button>
        {(league.settings as LeagueSettings | null)?.whatsappGroupLink && (
          <Button asChild variant="outline" size="sm">
            <a
              href={(league.settings as LeagueSettings).whatsappGroupLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              WhatsApp Group
            </a>
          </Button>
        )}
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-t-2 border-t-primary/20 hover:border-t-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {league.memberCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-t-2 border-t-primary/20 hover:border-t-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardDescription>Active Season</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="size-5 text-muted-foreground" />
              {activeSeason ? (
                <span className="truncate">{activeSeason.name}</span>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-t-2 border-t-primary/20 hover:border-t-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardDescription>Current Round</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LayoutList className="size-5 text-muted-foreground" />
              {activeRound ? (
                <Link
                  href={`/leagues/${id}/rounds/${activeRound.id}`}
                  className="truncate hover:underline"
                >
                  {activeRound.theme}
                </Link>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Members */}
      <CollapsibleSection title="Members">
        <MembersList leagueId={id} userRole={league.userRole ?? "member"} />
      </CollapsibleSection>

      {/* Seasons */}
      <div className="space-y-3">
        <SeasonSwitcher
          leagueId={id}
          userRole={league.userRole ?? "member"}
          onCreateSeason={() => setCreateSeasonOpen(true)}
        />
        <div className="flex gap-3">
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href={`/leagues/${id}/seasons`}>View All Seasons</Link>
          </Button>
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href={`/leagues/${id}/leaderboards`}>View Full Leaderboard</Link>
          </Button>
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)]">Rounds</h2>
          {isOwnerOrAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setCreateRoundOpen(true)} disabled={!hasSeasons}>
                <Plus className="size-4 mr-1.5" />
                Create Round
              </Button>
              {!hasSeasons && (
                <span className="text-xs text-muted-foreground">Create a season first</span>
              )}
            </div>
          )}
        </div>
        {recentRounds && recentRounds.length > 0 ? (
          <div className="space-y-2">
            {recentRounds.slice(0, 5).map((round) => (
              <Link key={round.id} href={`/leagues/${id}/rounds/${round.id}`} className="block">
              <Card className="border-l-2 border-l-primary/20 hover:border-l-primary/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-accent/50 cursor-pointer">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {round.theme}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {round.submissionCount} submissions
                      </span>
                      <Badge variant={statusVariant[round.status] ?? "outline"}>
                        {round.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              </Link>
            ))}
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href={`/leagues/${id}/rounds`}>View All Rounds</Link>
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                icon={Music}
                title="No rounds yet"
                description={
                  isOwnerOrAdmin
                    ? "Create a round to start collecting song submissions from your league members."
                    : "No rounds have been created yet. Check back soon!"
                }
                action={
                  isOwnerOrAdmin && hasSeasons ? (
                    <Button size="sm" onClick={() => setCreateRoundOpen(true)}>
                      <Plus className="size-4 mr-1.5" />
                      Create Round
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      <CreateSeasonForm
        leagueId={id}
        open={createSeasonOpen}
        onOpenChange={setCreateSeasonOpen}
      />

      <CreateRoundForm
        leagueId={id}
        seasonId={activeSeason?.id}
        open={createRoundOpen}
        onOpenChange={setCreateRoundOpen}
      />
    </div>
  );
}
