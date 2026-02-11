import { SeasonDetail } from "@/components/league/SeasonDetail";

export const metadata = { title: "Season Detail" };

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  return <SeasonDetail leagueId={id} seasonId={seasonId} />;
}
