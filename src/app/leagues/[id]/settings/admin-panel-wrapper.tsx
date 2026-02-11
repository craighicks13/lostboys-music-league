"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/app/providers";
import { AdminPanel } from "@/components/league/AdminPanel";

export function AdminPanelWrapper() {
  const params = useParams();
  const id = params.id as string;

  const { data: league } = trpc.league.getById.useQuery({ id });

  if (!league) return null;

  return <AdminPanel leagueId={id} userRole={league.userRole} />;
}
