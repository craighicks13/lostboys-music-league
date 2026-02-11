import { LeagueAnalytics } from "@/components/league/LeagueAnalytics";

export default async function LeagueAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeagueAnalytics leagueId={id} />;
}
