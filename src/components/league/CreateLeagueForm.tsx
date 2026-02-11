"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import { createLeagueSchema } from "@/lib/validators/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";

export function CreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createLeague = trpc.league.create.useMutation({
    onSuccess: (result) => {
      toast.success("League created successfully");
      router.push(`/leagues/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const parsed = createLeagueSchema.safeParse({
      name,
      description: description || undefined,
      isPrivate,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    createLeague.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>League Details</CardTitle>
          <CardDescription>
            Set up your new music league. You can adjust settings after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Music League"
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
              placeholder="What's this league about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private">Private League</Label>
              <p className="text-sm text-muted-foreground">
                Only invited members can join
              </p>
            </div>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          {(validationError || createLeague.error) && (
            <p className="text-sm text-red-500">
              {validationError ?? createLeague.error?.message}
            </p>
          )}
          <Button type="submit" disabled={createLeague.isPending}>
            {createLeague.isPending ? "Creating..." : "Create League"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
