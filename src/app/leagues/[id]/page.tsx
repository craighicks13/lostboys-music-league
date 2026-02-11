import type { Metadata } from "next";
import { LeagueDashboard } from "@/components/league/LeagueDashboard";

export const metadata: Metadata = {
  title: "League Dashboard",
  description: "View your league dashboard with active rounds, leaderboard, and quick links.",
};

export default function LeagueDashboardPage() {
  return <LeagueDashboard />;
}
