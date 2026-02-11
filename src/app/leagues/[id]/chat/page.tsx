import { LeagueChat } from "@/components/league/LeagueChat";

export const metadata = { title: "League Chat" };

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto max-w-3xl py-4 px-4 h-[calc(100vh-12rem)] sm:h-[calc(100vh-8rem)]">
      <LeagueChat leagueId={id} />
    </div>
  );
}
