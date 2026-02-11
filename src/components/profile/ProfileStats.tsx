"use client";

import Link from "next/link";
import { trpc } from "@/app/providers";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-bold">{value}</p>
			</CardContent>
		</Card>
	);
}

export function ProfileStats() {
	const { data, isLoading } = trpc.analytics.myStats.useQuery();

	if (isLoading) {
		return (
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Your Stats</h2>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<Skeleton className="h-32" />
			</div>
		);
	}

	if (!data || data.leaguesJoined === 0) {
		return (
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Your Stats</h2>
				<p className="text-sm text-muted-foreground">
					Join a league and start submitting to see your stats.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">Your Stats</h2>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<StatCard label="Leagues Joined" value={data.leaguesJoined} />
				<StatCard label="Total Submissions" value={data.totalSubmissions} />
				<StatCard label="Total Wins" value={data.totalWins} />
				<StatCard
					label="Avg Placement"
					value={data.avgPlacement != null ? data.avgPlacement.toFixed(1) : "--"}
				/>
				<StatCard label="Total Points" value={data.totalPoints} />
			</div>

			{data.perLeague.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Per League</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 font-medium">League</th>
										<th className="pb-2 font-medium text-right">Submissions</th>
										<th className="pb-2 font-medium text-right">Rounds</th>
										<th className="pb-2 font-medium text-right">Wins</th>
										<th className="pb-2 font-medium text-right">Points</th>
									</tr>
								</thead>
								<tbody>
									{data.perLeague.map((league) => (
										<tr key={league.leagueId} className="border-b last:border-0">
											<td className="py-2">
												<Link
													href={`/leagues/${league.leagueId}`}
													className="text-primary hover:underline"
												>
													{league.leagueName}
												</Link>
											</td>
											<td className="py-2 text-right">{league.submissionCount}</td>
											<td className="py-2 text-right">{league.roundsParticipated}</td>
											<td className="py-2 text-right">{league.wins}</td>
											<td className="py-2 text-right">{league.totalPoints}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
