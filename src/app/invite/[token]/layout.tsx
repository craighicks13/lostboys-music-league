import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're Invited",
  description:
    "You've been invited to join a Music League. Sign in and start competing with friends!",
  openGraph: {
    title: "You're Invited to Music League",
    description:
      "Join the league, submit songs to themed rounds, vote on your favorites, and climb the leaderboard.",
  },
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
