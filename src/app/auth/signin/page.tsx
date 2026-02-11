import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Music League with Google, Spotify, Apple, or a magic link.",
};

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in to Music League"
      description="Choose your preferred sign-in method"
    >
      <div className="flex flex-col gap-6">
        <OAuthButtons />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <SignInForm />
      </div>
    </AuthCard>
  );
}
