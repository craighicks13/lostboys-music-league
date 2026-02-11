"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { trpc } from "@/app/providers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeagueSearch({ leagueId }: { leagueId: string }) {
  const [query, setQuery] = useState("");
  const [seasonId, setSeasonId] = useState<string | undefined>(undefined);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: seasons } = trpc.season.list.useQuery({ leagueId });

  const { data: results, isLoading } = trpc.analytics.searchSubmissions.useQuery(
    { leagueId, query: debouncedQuery, seasonId },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Debounce the search query
  const debounceTimer = useMemo(() => {
    let timer: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedQuery(value), 300);
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    debounceTimer(value);
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/leagues/${leagueId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Search Submissions</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search songs or artists..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {seasons && seasons.length > 0 && (
          <Select
            value={seasonId ?? "all"}
            onValueChange={(v) => setSeasonId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {debouncedQuery.length < 2 ? (
        <p className="text-center text-muted-foreground py-12">
          Search for songs and artists across all submissions
        </p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground py-12">Searching...</p>
      ) : results && results.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Track</th>
                <th className="px-4 py-3 text-left font-medium">Artist</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Album</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Round</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.trackName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.artist}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.album}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{row.roundTheme}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{row.submitterName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-12">
          No submissions found matching your search
        </p>
      )}
    </div>
  );
}
