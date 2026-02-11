import { LeaderboardPage } from "@/components/league/LeaderboardPage";

export default async function LeagueLeaderboardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeaderboardPage leagueId={id} />;
}
