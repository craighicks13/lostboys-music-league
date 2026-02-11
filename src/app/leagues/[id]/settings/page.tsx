import type { Metadata } from "next";
import { LeagueSettingsForm } from "@/components/league/LeagueSettingsForm";
import { AdminPanelWrapper } from "./admin-panel-wrapper";

export const metadata: Metadata = {
  title: "League Settings",
  description: "Manage your league settings, members, and moderation.",
};

export default function LeagueSettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold">League Settings</h1>
      <LeagueSettingsForm />
      <AdminPanelWrapper />
    </div>
  );
}
