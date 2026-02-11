"use client";

import { AlertCircle, Lock, Search, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

interface QueryErrorDisplayProps {
  error: { message: string; data?: { code?: string } } | Error;
  retry?: () => void;
  resource?: string;
}

function getErrorInfo(error: QueryErrorDisplayProps["error"], resource: string) {
  const code =
    "data" in error && error.data?.code ? error.data.code : undefined;

  switch (code) {
    case "UNAUTHORIZED":
      return {
        icon: LogIn,
        title: "Sign in required",
        description: "You need to sign in to access this.",
      };
    case "FORBIDDEN":
      return {
        icon: Lock,
        title: "Access denied",
        description: "You don't have permission to view this.",
      };
    case "NOT_FOUND":
      return {
        icon: Search,
        title: "Not found",
        description: `This ${resource} couldn't be found.`,
      };
    default:
      return {
        icon: AlertCircle,
        title: "Something went wrong",
        description: error.message || "An unexpected error occurred.",
      };
  }
}

export function QueryErrorDisplay({
  error,
  retry,
  resource = "resource",
}: QueryErrorDisplayProps) {
  const { icon: Icon, title, description } = getErrorInfo(error, resource);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground size-6" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {retry && (
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
