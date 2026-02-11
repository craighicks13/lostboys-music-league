import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join League",
  description: "Enter an invite code to join an existing Music League.",
};

export default function JoinLeagueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
