import { CompareMembers } from "@/components/league/CompareMembers";

export default async function CompareMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompareMembers leagueId={id} />;
}
