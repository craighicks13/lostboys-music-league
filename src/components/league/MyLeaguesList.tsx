"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import { trpc } from "@/app/providers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LeagueCard } from "@/components/league/LeagueCard";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card py-6 shadow-sm">
      <div className="px-6 space-y-3">
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="px-6 mt-6 flex items-center justify-between">
        <div className="h-5 w-16 rounded bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function MyLeaguesList() {
  const [search, setSearch] = useState("");
  const { data: leagues, isLoading, error } = trpc.league.list.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">
          Failed to load leagues: {error.message}
        </p>
      </div>
    );
  }

  if (!leagues || leagues.length === 0) {
    return (
      <EmptyState
        icon={Music}
        title="No leagues yet"
        description="Create your own league or join an existing one to start discovering music with friends."
        action={
          <div className="flex items-center gap-3">
            <Link href="/leagues/create">
              <Button>Create a League</Button>
            </Link>
            <Link href="/leagues/join">
              <Button variant="outline">Join a League</Button>
            </Link>
          </div>
        }
      />
    );
  }

  const filtered = leagues.filter((league) =>
    league.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search leagues..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No leagues match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  );
}
