"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export default function LeagueError({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-full">
            <AlertCircle className="text-muted-foreground size-6" />
          </div>
          <CardTitle>League error</CardTitle>
          <CardDescription>
            Something went wrong loading this league. It may not exist or you may
            not have access.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/leagues">Back to leagues</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
