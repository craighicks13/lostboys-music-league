import { RoundDetail } from "@/components/league/RoundDetail";

export const metadata = { title: "Round Detail" };

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>;
}) {
  const { roundId } = await params;
  return <RoundDetail roundId={roundId} />;
}
