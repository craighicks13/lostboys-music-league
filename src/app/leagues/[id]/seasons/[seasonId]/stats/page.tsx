import { SeasonStatsPage } from "@/components/league/SeasonStatsPage";

export default async function SeasonStatsRoute({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  return <SeasonStatsPage leagueId={id} seasonId={seasonId} />;
}
