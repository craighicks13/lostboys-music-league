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
import { Artist } from '@/lib/types';
import { useState } from 'react';
import React from 'react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface ArtistTableProps {
	artists: Artist[];
}

export function ArtistTable({ artists }: ArtistTableProps) {
	const [expandedArtist, setExpandedArtist] = useState<string | null>(
		null
	);

	const toggleArtistExpand = (artistName: string) => {
		if (expandedArtist === artistName) {
			setExpandedArtist(null);
		} else {
			setExpandedArtist(artistName);
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Lost Boys Music League Artists</CardTitle>
			</CardHeader>
			<CardContent className="px-1 sm:px-6">
				<div className="overflow-x-auto">
					<Table className="w-full table-fixed">
						<TableHeader>
							<TableRow className="bg-secondary">
								<TableHead className="w-[75%]">Artist</TableHead>
								<TableHead className="w-[25%] text-right">
									Songs
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{artists.map((artist) => (
								<React.Fragment key={artist.name}>
									<TableRow
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => toggleArtistExpand(artist.name)}
									>
										<TableCell className="font-medium">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="truncate">
															{artist.name}
														</div>
													</TooltipTrigger>
													<TooltipContent>
														{artist.name}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</TableCell>
										<TableCell className="text-right">
											{artist.songs.length}
										</TableCell>
									</TableRow>
									{expandedArtist === artist.name && (
										<TableRow className="bg-muted/20">
											<TableCell colSpan={2} className="p-0">
												<div className="p-2 sm:p-4">
													<Table className="table-fixed">
														<TableHeader>
															<TableRow>
																<TableHead className="w-[65%]">
																	Song
																</TableHead>
																<TableHead className="w-[35%]">
																	Album
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{artist.songs.map((song) => (
																<TableRow key={song.id}>
																	<TableCell>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<div className="truncate">
																						{song.song}
																					</div>
																				</TooltipTrigger>
																				<TooltipContent>
																					{song.song}
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																	</TableCell>
																	<TableCell>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<div className="truncate">
																						{song.album}
																					</div>
																				</TooltipTrigger>
																				<TooltipContent>
																					{song.album}
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</div>
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
