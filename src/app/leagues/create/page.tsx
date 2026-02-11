import type { Metadata } from "next";
import { CreateLeagueForm } from "@/components/league/CreateLeagueForm";

export const metadata: Metadata = {
  title: "Create League",
  description: "Create a new Music League and invite your friends to compete.",
};

export default function CreateLeaguePage() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create a League</h1>
      <CreateLeagueForm />
    </div>
  );
}
