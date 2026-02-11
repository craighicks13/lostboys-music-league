import { UserStatsPage } from "@/components/league/UserStatsPage";

export default async function MemberStatsPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  return <UserStatsPage leagueId={id} userId={userId} />;
}
