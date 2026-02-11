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
import { Music, Users, Trophy, Sparkles } from "lucide-react";

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
      <section className="py-20 px-4 text-center">
        <div className="container max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center">
            <Music className="size-12 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Lost Boys Music League
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Compete with friends by submitting songs to themed rounds, vote on
            your favorites, and climb the leaderboard.
          </p>
          <div className="pt-4">
            {session?.user ? (
              <Button size="lg" asChild>
                <Link href="/leagues">Go to My Leagues</Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="container max-w-5xl mx-auto space-y-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Why you will love it
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <Users className="size-8 text-primary" />
                </div>
                <CardTitle>Create Leagues</CardTitle>
                <CardDescription>
                  Set up private leagues and invite your friends with a simple
                  link or code.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <Music className="size-8 text-primary" />
                </div>
                <CardTitle>Themed Rounds</CardTitle>
                <CardDescription>
                  Each round has a unique theme. Submit a song that fits and see
                  what everyone else picks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <Trophy className="size-8 text-primary" />
                </div>
                <CardTitle>Vote and Rank</CardTitle>
                <CardDescription>
                  Listen to every submission, cast your votes, and watch the
                  leaderboard update in real time.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center pb-2">
                  <Sparkles className="size-8 text-primary" />
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
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
            ].map((item) => (
              <li key={item.step} className="flex gap-4 items-start">
                <span className="flex-none flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
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
      <section className="py-16 px-4 bg-muted/40">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to play?</h2>
          <p className="text-muted-foreground">
            Join your friends and start discovering music together.
          </p>
          {session?.user ? (
            <Button size="lg" asChild>
              <Link href="/leagues">Go to My Leagues</Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/auth/signin">Get Started</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
