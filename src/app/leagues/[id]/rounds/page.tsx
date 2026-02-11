import { RoundArchive } from "@/components/league/RoundArchive";

export const metadata = { title: "Rounds" };

export default async function RoundsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Rounds</h1>
      <RoundArchive leagueId={id} />
    </div>
  );
}
