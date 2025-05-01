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
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Artist</TableHead>
							<TableHead className="text-right">Song Count</TableHead>
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
										{artist.name}
									</TableCell>
									<TableCell className="text-right">
										{artist.songs.length}
									</TableCell>
								</TableRow>
								{expandedArtist === artist.name && (
									<TableRow className="bg-muted/20">
										<TableCell colSpan={2} className="p-0">
											<div className="p-4">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Song</TableHead>
															<TableHead>Album</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{artist.songs.map((song) => (
															<TableRow key={song.id}>
																<TableCell>{song.song}</TableCell>
																<TableCell>{song.album}</TableCell>
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
			</CardContent>
		</Card>
	);
}
