"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: "The sign-in link is invalid or has expired. Please request a new one.",
  USER_NOT_FOUND: "No account found with that email. Please sign up first.",
  ACCOUNT_NOT_LINKED: "This email is already associated with another sign-in method. Please use your original sign-in method.",
  INVALID_CALLBACK: "There was a problem completing the sign-in. Please try again.",
  ACCESS_DENIED: "Access was denied. Please try again.",
  CONFIGURATION_ERROR: "There was a server configuration error. Please try again later.",
  Default: "An unexpected error occurred. Please try again.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") ?? "Default";
  const message = errorMessages[errorType] ?? errorMessages.Default;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild>
        <Link href="/auth/signin">Try again</Link>
      </Button>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <AuthCard title="Authentication Error" description="Something went wrong">
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <ErrorContent />
      </Suspense>
    </AuthCard>
  );
}
