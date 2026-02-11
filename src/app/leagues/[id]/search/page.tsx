import { LeagueSearch } from "@/components/league/LeagueSearch";

export default async function LeagueSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeagueSearch leagueId={id} />;
}
