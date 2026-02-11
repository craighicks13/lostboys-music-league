"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeagueCardProps {
  league: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    createdAt: Date | string;
    role?: string;
    userRole?: string;
    memberCount: number;
  };
}

const roleBadgeStyles: Record<string, string> = {
  owner:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  admin:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  member:
    "border-border bg-transparent text-muted-foreground",
};

export function LeagueCard({ league }: LeagueCardProps) {
  const role = league.role ?? league.userRole ?? "member";
  const description =
    league.description && league.description.length > 100
      ? league.description.slice(0, 100) + "..."
      : league.description;

  const createdDate = new Date(league.createdAt).toLocaleDateString();

  return (
    <Link href={`/leagues/${league.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle>{league.name}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
              roleBadgeStyles[role] ?? roleBadgeStyles.member
            )}
          >
            {role}
          </span>
          <div className="flex items-center gap-3">
            <span>
              {league.memberCount} {league.memberCount === 1 ? "member" : "members"}
            </span>
            <span>{createdDate}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
