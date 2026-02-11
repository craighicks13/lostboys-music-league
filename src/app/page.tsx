import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, Music, Trophy, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Music League - Social Music Discovery",
  description:
    "Create leagues, submit songs to themed rounds, vote on your favorites, and compete with friends on the leaderboard.",
  openGraph: {
    title: "Music League - Social Music Discovery",
    description:
      "Create leagues, submit songs to themed rounds, vote on your favorites, and compete with friends on the leaderboard.",
  },
};

export default async function Home() {
  const result = await auth.api.getSession({ headers: await headers() });
  const session = result ? { user: result.user } : null;

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-primary/5 via-background to-accent-highlight/5">
        <div className="container max-w-3xl mx-auto space-y-6">
          <div className="flex items-end justify-center gap-1 h-12">
            <span className="w-1.5 rounded-full bg-primary animate-equalizer" />
            <span className="w-1.5 rounded-full bg-primary animate-equalizer-delay" />
            <span className="w-1.5 rounded-full bg-primary animate-equalizer-delay-2" />
            <span className="w-1.5 rounded-full bg-primary animate-equalizer" />
            <span className="w-1.5 rounded-full bg-primary animate-equalizer-delay" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold font-[family-name:var(--font-heading)] tracking-tight gradient-text">
            Lost Boys Music League
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Compete with friends by submitting songs to themed rounds, vote on
            your favorites, and climb the leaderboard.
          </p>
          <div className="pt-4">
            {session?.user ? (
              <Button
                size="lg"
                asChild
                className="gradient-primary text-white border-0 hover:opacity-90 glow-primary"
              >
                <Link href="/leagues">Go to My Leagues</Link>
              </Button>
            ) : (
              <Button
                size="lg"
                asChild
                className="gradient-primary text-white border-0 hover:opacity-90 glow-primary"
              >
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="container max-w-5xl mx-auto space-y-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center font-[family-name:var(--font-heading)]">
            Why you will love it
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center border-l-4 border-l-transparent hover:border-l-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <div className="gradient-primary rounded-xl p-3 text-white">
                    <Users className="size-8" />
                  </div>
                </div>
                <CardTitle>Create Leagues</CardTitle>
                <CardDescription>
                  Set up private leagues and invite your friends with a simple
                  link or code.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-l-4 border-l-transparent hover:border-l-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <div className="gradient-primary rounded-xl p-3 text-white">
                    <Music className="size-8" />
                  </div>
                </div>
                <CardTitle>Themed Rounds</CardTitle>
                <CardDescription>
                  Each round has a unique theme. Submit a song that fits and see
                  what everyone else picks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-l-4 border-l-transparent hover:border-l-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <div className="gradient-primary rounded-xl p-3 text-white">
                    <Trophy className="size-8" />
                  </div>
                </div>
                <CardTitle>Vote and Rank</CardTitle>
                <CardDescription>
                  Listen to every submission, cast your votes, and watch the
                  leaderboard update in real time.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-l-4 border-l-transparent hover:border-l-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <div className="gradient-primary rounded-xl p-3 text-white">
                    <Sparkles className="size-8" />
                  </div>
                </div>
                <CardTitle>AI-Powered Themes</CardTitle>
                <CardDescription>
                  Stuck for ideas? Let AI suggest creative round themes and
                  generate artwork for each round.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center font-[family-name:var(--font-heading)]">
            How it works
          </h2>
          <ol className="space-y-8">
            {[
              {
                step: 1,
                title: "Create or join a league",
                description:
                  "Start your own league or join one using an invite link. Add friends and set the rules.",
              },
              {
                step: 2,
                title: "Submit songs each round",
                description:
                  "A new theme drops every round. Pick a track that matches, submit it before the deadline.",
              },
              {
                step: 3,
                title: "Vote on submissions",
                description:
                  "Listen to everyone's picks, then rank your favorites. Points are tallied automatically.",
              },
              {
                step: 4,
                title: "Climb the leaderboard",
                description:
                  "Scores carry across rounds and seasons. See who has the best taste in music.",
              },
            ].map((item, index) => (
              <li key={item.step} className="relative flex gap-4 items-start">
                {index < 3 && (
                  <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                )}
                <span className="relative z-10 flex-none flex items-center justify-center size-10 rounded-full gradient-primary text-white font-bold text-lg shadow-md">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/10 via-accent-highlight/5 to-primary/10">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-heading)]">
            Ready to play?
          </h2>
          <p className="text-muted-foreground">
            Join your friends and start discovering music together.
          </p>
          {session?.user ? (
            <Button
              size="lg"
              asChild
              className="gradient-primary text-white border-0 hover:opacity-90 glow-primary"
            >
              <Link href="/leagues">Go to My Leagues</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              asChild
              className="gradient-primary text-white border-0 hover:opacity-90 glow-primary"
            >
              <Link href="/auth/signin">Get Started</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
