"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ArtworkManagerProps {
	roundId: string;
	leagueId: string;
	theme: string;
	currentArtworkUrl: string | null;
	isAdmin: boolean;
}

export function ArtworkManager({
	roundId,
	leagueId,
	theme,
	currentArtworkUrl,
	isAdmin,
}: ArtworkManagerProps) {
	const utils = trpc.useUtils();
	const [error, setError] = useState<string | null>(null);

	const generateArtwork = trpc.ai.generateArtwork.useMutation({
		onSuccess: () => {
			setError(null);
			toast.success("Artwork generated");
			utils.round.getById.invalidate({ id: roundId });
		},
		onError: (err) => {
			setError(err.message);
			toast.error("Failed to generate artwork");
		},
	});

	const regenerateArtwork = trpc.ai.regenerateArtwork.useMutation({
		onSuccess: () => {
			setError(null);
			toast.success("Artwork regenerated");
			utils.round.getById.invalidate({ id: roundId });
		},
		onError: (err) => {
			setError(err.message);
			toast.error("Failed to regenerate artwork");
		},
	});

	const isPending = generateArtwork.isPending || regenerateArtwork.isPending;

	function handleGenerate() {
		setError(null);
		generateArtwork.mutate({ roundId, theme, leagueId });
	}

	function handleRegenerate() {
		setError(null);
		regenerateArtwork.mutate({ roundId, leagueId });
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImageIcon className="size-5" />
					Round Artwork
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Image area */}
				<div className="mx-auto max-w-sm">
					{isPending ? (
						<div className="space-y-2">
							<Skeleton className="aspect-square w-full rounded-lg" />
							<p className="text-sm text-muted-foreground text-center">
								Generating artwork...
							</p>
						</div>
					) : currentArtworkUrl ? (
						<Image
							src={currentArtworkUrl}
							alt={`Artwork for ${theme}`}
							width={384}
							height={384}
							className="aspect-square w-full rounded-lg object-cover"
						/>
					) : (
						<div className="aspect-square w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center gap-2">
							<ImageIcon className="size-10 text-muted-foreground/50" />
							<p className="text-sm text-muted-foreground">
								No artwork generated
							</p>
						</div>
					)}
				</div>

				{/* Error state */}
				{error && (
					<div className="text-center space-y-2">
						<p className="text-sm text-destructive">{error}</p>
						<Button
							variant="outline"
							size="sm"
							onClick={currentArtworkUrl ? handleRegenerate : handleGenerate}
						>
							Try Again
						</Button>
					</div>
				)}

				{/* Action buttons */}
				{isAdmin && !error && (
					<div className="flex justify-center">
						{currentArtworkUrl ? (
							<Button
								variant="outline"
								size="sm"
								onClick={handleRegenerate}
								disabled={isPending}
							>
								<RefreshCw className="size-4 mr-1.5" />
								Regenerate Artwork
							</Button>
						) : (
							<Button
								size="sm"
								onClick={handleGenerate}
								disabled={isPending}
							>
								<Sparkles className="size-4 mr-1.5" />
								Generate Artwork
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
