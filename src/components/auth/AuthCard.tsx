"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music } from "lucide-react";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent-highlight/5">
      <Card className="w-full max-w-md glass border-white/20 dark:border-white/10 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-white">
            <Music className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-[family-name:var(--font-heading)]">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
