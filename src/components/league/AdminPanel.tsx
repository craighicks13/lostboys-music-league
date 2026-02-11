"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MembersList } from "@/components/league/MembersList";
import { ModerationLog } from "@/components/league/ModerationLog";

interface AdminPanelProps {
  leagueId: string;
  userRole: string;
}

export function AdminPanel({ leagueId, userRole }: AdminPanelProps) {
  if (userRole !== "owner" && userRole !== "admin") {
    return null;
  }

  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="members" className="flex-1">
          Members
        </TabsTrigger>
        <TabsTrigger value="moderation" className="flex-1">
          Moderation Log
        </TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <MembersList leagueId={leagueId} userRole={userRole} />
      </TabsContent>
      <TabsContent value="moderation">
        <ModerationLog leagueId={leagueId} />
      </TabsContent>
    </Tabs>
  );
}
