"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ThemeSuggestionProps {
	leagueId: string;
	onSelectTheme: (theme: string, description: string) => void;
}

export function ThemeSuggestion({ leagueId, onSelectTheme }: ThemeSuggestionProps) {
	const [context, setContext] = useState("");
	const [suggestions, setSuggestions] = useState<{ theme: string; description: string }[]>([]);
	const [refineFeedback, setRefineFeedback] = useState("");
	const [refineTarget, setRefineTarget] = useState<{ theme: string; description: string } | null>(null);
	const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
	const [refinedResult, setRefinedResult] = useState<{ theme: string; description: string } | null>(null);

	const suggestThemes = trpc.ai.suggestThemes.useMutation({
		onSuccess: (data) => {
			setSuggestions(data);
			setRefineTarget(null);
			setRefinedResult(null);
			setChatHistory([]);
			setRefineFeedback("");
		},
	});

	const refineTheme = trpc.ai.refineTheme.useMutation({
		onSuccess: (data) => {
			setRefinedResult(data);
			setChatHistory((prev) => [
				...prev,
				{ role: "assistant" as const, content: `${data.theme}: ${data.description}` },
			]);
		},
	});

	function handleGenerate() {
		suggestThemes.mutate({
			leagueId,
			context: context.trim() || undefined,
		});
	}

	function handleRefine() {
		const feedback = refineFeedback.trim();
		if (!feedback || !refineTarget) return;

		const newHistory: { role: "user" | "assistant"; content: string }[] = [
			...chatHistory,
			{ role: "user", content: feedback },
		];
		setChatHistory(newHistory);
		setRefineFeedback("");

		refineTheme.mutate({
			theme: refineTarget.theme,
			feedback,
			history: newHistory.length > 1 ? newHistory : undefined,
		});
	}

	function handleSelectSuggestion(theme: string, description: string) {
		setRefineTarget({ theme, description });
		setRefinedResult(null);
		setChatHistory([]);
	}

	return (
		<Card className="gap-3 py-3">
			<CardHeader className="px-3 pb-0">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Sparkles className="h-4 w-4" />
					AI Theme Ideas
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 px-3">
				<div className="flex gap-2">
					<Input
						placeholder="What kind of themes? (optional)"
						value={context}
						onChange={(e) => setContext(e.target.value)}
						className="text-sm"
					/>
					<Button
						type="button"
						size="sm"
						onClick={handleGenerate}
						disabled={suggestThemes.isPending}
					>
						{suggestThemes.isPending ? (
							<>
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								Generating...
							</>
						) : (
							"Generate Ideas"
						)}
					</Button>
				</div>

				{suggestThemes.error && (
					<div className="flex items-center justify-between rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
						<span>Failed to generate themes</span>
						<Button type="button" size="sm" variant="ghost" onClick={handleGenerate}>
							Retry
						</Button>
					</div>
				)}

				{suggestions.length > 0 && (
					<div className="space-y-2">
						{suggestions.map((suggestion, i) => (
							<div
								key={i}
								className="flex items-start justify-between gap-2 rounded-md border p-2"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{suggestion.theme}</p>
									<p className="text-muted-foreground text-xs">{suggestion.description}</p>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="text-xs"
										onClick={() => handleSelectSuggestion(suggestion.theme, suggestion.description)}
									>
										Refine
									</Button>
									<Button
										type="button"
										size="sm"
										className="text-xs"
										onClick={() => onSelectTheme(suggestion.theme, suggestion.description)}
									>
										Use This
									</Button>
								</div>
							</div>
						))}
					</div>
				)}

				{refineTarget && (
					<div className="space-y-2 rounded-md border p-2">
						<p className="text-muted-foreground text-xs">
							Refining: <span className="font-medium text-foreground">{refineTarget.theme}</span>
						</p>
						<div className="flex gap-2">
							<Input
								placeholder="Tell me more about what you want..."
								value={refineFeedback}
								onChange={(e) => setRefineFeedback(e.target.value)}
								className="text-sm"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleRefine();
									}
								}}
							/>
							<Button
								type="button"
								size="sm"
								onClick={handleRefine}
								disabled={refineTheme.isPending || !refineFeedback.trim()}
							>
								{refineTheme.isPending ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<Send className="h-3 w-3" />
								)}
							</Button>
						</div>

						{refineTheme.error && (
							<p className="text-xs text-red-600 dark:text-red-400">
								Failed to refine theme. Try again.
							</p>
						)}

						{refinedResult && (
							<div className="flex items-start justify-between gap-2 rounded-md bg-muted p-2">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{refinedResult.theme}</p>
									<p className="text-muted-foreground text-xs">{refinedResult.description}</p>
								</div>
								<Button
									type="button"
									size="sm"
									className="shrink-0 text-xs"
									onClick={() => onSelectTheme(refinedResult.theme, refinedResult.description)}
								>
									Use This
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
