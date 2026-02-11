import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Check Your Email - Music League",
};

export default function VerifyRequestPage() {
  return (
    <AuthCard
      title="Check your email"
      description="A sign-in link has been sent to your email address"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. If you don&apos;t see it,
            check your spam folder.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
