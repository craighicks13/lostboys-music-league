import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Song } from '@/lib/types';
import React from 'react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopSongsProps {
	allSongs: Song[];
}

interface SongCount {
	song: string;
	artist: string;
	count: number;
	examples: Song[]; // Keep track of actual song objects
}

export function TopSongs({ allSongs }: TopSongsProps) {
	// Count occurrences of each song
	const songCounts = new Map<string, SongCount>();

	for (const song of allSongs) {
		// Create a key based on song name and artist to identify unique songs
		const key = `${song.song.toLowerCase()}|${song.artist.toLowerCase()}`;

		if (!songCounts.has(key)) {
			songCounts.set(key, {
				song: song.song,
				artist: song.artist,
				count: 0,
				examples: [],
			});
		}

		const songCount = songCounts.get(key)!;
		songCount.count++;
		songCount.examples.push(song);
	}

	// Filter songs that appear more than once and sort by count (descending)
	const duplicateSongs = Array.from(songCounts.values())
		.filter((sc) => sc.count > 1)
		.sort((a, b) => b.count - a.count);

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Most Submitted Songs</CardTitle>
			</CardHeader>
			<CardContent className="px-1 sm:px-6">
				{duplicateSongs.length === 0 ? (
					<p className="text-center text-muted-foreground py-4">
						No songs have been submitted more than once.
					</p>
				) : (
					<div className="overflow-x-auto">
						<Table className="w-full table-fixed">
							<TableHeader>
								<TableRow className="bg-secondary">
									<TableHead className="w-[15%] text-center">
										Count
									</TableHead>
									<TableHead className="w-[45%]">Song</TableHead>
									<TableHead className="w-[40%]">Artist</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{duplicateSongs.map((songCount, index) => (
									<TableRow key={index}>
										<TableCell className="text-center font-bold">
											{songCount.count}
										</TableCell>
										<TableCell className="font-medium">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="truncate">
															{songCount.song}
														</div>
													</TooltipTrigger>
													<TooltipContent>
														{songCount.song}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</TableCell>
										<TableCell>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="truncate">
															{songCount.artist}
														</div>
													</TooltipTrigger>
													<TooltipContent>
														{songCount.artist}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

