import type { Metadata } from "next";
import { MyLeaguesList } from "@/components/league/MyLeaguesList";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Leagues",
  description: "View and manage your Music League leagues.",
};

export default function LeaguesPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Leagues</h1>
        <Link href="/leagues/create">
          <Button>Create League</Button>
        </Link>
      </div>
      <MyLeaguesList />
    </div>
  );
}
