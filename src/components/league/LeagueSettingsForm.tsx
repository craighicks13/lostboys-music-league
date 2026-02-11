"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/app/providers";
import type { LeagueSettings } from "@/lib/validators/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";

export function LeagueSettingsForm() {
  const params = useParams();
  const id = params.id as string;

  const utils = trpc.useUtils();
  const league = trpc.league.getById.useQuery({ id });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [votingStyle, setVotingStyle] = useState<"points" | "rank" | "single_pick">("points");
  const [anonymousSubmissions, setAnonymousSubmissions] = useState(false);
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [maxUpvotes, setMaxUpvotes] = useState(3);
  const [upvotePointsStr, setUpvotePointsStr] = useState("3, 2, 1");
  const [downvotingEnabled, setDownvotingEnabled] = useState(false);
  const [maxDownvotes, setMaxDownvotes] = useState(1);
  const [downvotePointsStr, setDownvotePointsStr] = useState("-1");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");

  useEffect(() => {
    if (league.data) {
      setName(league.data.name);
      setDescription(league.data.description ?? "");
      setIsPrivate(league.data.visibility === "private");
      const s = league.data.settings as LeagueSettings | null;
      if (s) {
        if (s.votingStyle) setVotingStyle(s.votingStyle);
        if (s.anonymousSubmissions !== undefined) setAnonymousSubmissions(s.anonymousSubmissions);
        if (s.allowSelfVote !== undefined) setAllowSelfVote(s.allowSelfVote);
        if (s.maxUpvotes) setMaxUpvotes(s.maxUpvotes);
        if (s.upvotePoints) setUpvotePointsStr(s.upvotePoints.join(", "));
        if (s.downvotingEnabled !== undefined) setDownvotingEnabled(s.downvotingEnabled);
        if (s.maxDownvotes) setMaxDownvotes(s.maxDownvotes);
        if (s.downvotePoints) setDownvotePointsStr(s.downvotePoints.join(", "));
        if (s.whatsappGroupLink !== undefined) setWhatsappGroupLink(s.whatsappGroupLink);
      }
    }
  }, [league.data]);

  const updateSettings = trpc.league.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      utils.league.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function parseNumberArray(str: string): number[] {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((n) => !isNaN(n));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    updateSettings.mutate({
      id,
      name,
      description: description || undefined,
      isPrivate,
      settings: {
        votingStyle,
        anonymousSubmissions,
        allowSelfVote,
        maxUpvotes,
        upvotePoints: parseNumberArray(upvotePointsStr),
        downvotingEnabled,
        maxDownvotes,
        downvotePoints: parseNumberArray(downvotePointsStr),
        whatsappGroupLink: whatsappGroupLink || undefined,
      },
    });
  }

  if (league.isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (league.error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-red-500">
            Failed to load league: {league.error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="private">Private League</Label>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <Separator />

          <CardTitle>Voting Rules</CardTitle>

          <div className="space-y-2">
            <Label htmlFor="votingStyle">Voting Style</Label>
            <Select value={votingStyle} onValueChange={(v) => setVotingStyle(v as typeof votingStyle)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="single_pick">Single Pick</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="anon">Anonymous Submissions</Label>
            <Switch
              id="anon"
              checked={anonymousSubmissions}
              onCheckedChange={setAnonymousSubmissions}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="selfVote">Allow Self Vote</Label>
            <Switch
              id="selfVote"
              checked={allowSelfVote}
              onCheckedChange={setAllowSelfVote}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUpvotes">Max Upvotes</Label>
            <Input
              id="maxUpvotes"
              type="number"
              min={1}
              max={10}
              value={maxUpvotes}
              onChange={(e) => setMaxUpvotes(Number(e.target.value))}
            />
          </div>

          {votingStyle === "points" && (
            <div className="space-y-2">
              <Label htmlFor="upvotePoints">Upvote Points</Label>
              <Input
                id="upvotePoints"
                placeholder="3, 2, 1"
                value={upvotePointsStr}
                onChange={(e) => setUpvotePointsStr(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated point values (e.g. 3, 2, 1)
              </p>
            </div>
          )}

          <Separator />

          <CardTitle>Downvoting</CardTitle>

          <div className="flex items-center justify-between">
            <Label htmlFor="downvoting">Enable Downvoting</Label>
            <Switch
              id="downvoting"
              checked={downvotingEnabled}
              onCheckedChange={setDownvotingEnabled}
            />
          </div>

          {downvotingEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="maxDownvotes">Max Downvotes</Label>
                <Input
                  id="maxDownvotes"
                  type="number"
                  min={1}
                  max={10}
                  value={maxDownvotes}
                  onChange={(e) => setMaxDownvotes(Number(e.target.value))}
                />
              </div>

              {votingStyle === "points" && (
                <div className="space-y-2">
                  <Label htmlFor="downvotePoints">Downvote Points</Label>
                  <Input
                    id="downvotePoints"
                    placeholder="-1"
                    value={downvotePointsStr}
                    onChange={(e) => setDownvotePointsStr(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated point values (e.g. -1)
                  </p>
                </div>
              )}
            </>
          )}

          <Separator />

          <CardTitle>WhatsApp Group</CardTitle>

          <div className="space-y-2">
            <Label htmlFor="whatsappGroupLink">WhatsApp Group Link</Label>
            <Input
              id="whatsappGroupLink"
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappGroupLink}
              onChange={(e) => setWhatsappGroupLink(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Paste your WhatsApp group invite link to show it on the league dashboard
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          {updateSettings.error && (
            <p className="text-sm text-red-500">
              {updateSettings.error.message}
            </p>
          )}
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
