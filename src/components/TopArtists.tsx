'use client';

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Artist } from '@/lib/types';
import React, { useState } from 'react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface TopArtistsProps {
	artists: Artist[];
}

export function TopArtists({ artists }: TopArtistsProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Sort artists by number of songs (descending)
	const sortedArtists = [...artists].sort(
		(a, b) => b.songs.length - a.songs.length
	);

	// Calculate pagination
	const totalPages = Math.ceil(sortedArtists.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentArtists = sortedArtists.slice(startIndex, endIndex);

	// Reset to page 1 if current page is out of bounds after changing items per page
	React.useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(1);
		}
	}, [currentPage, totalPages]);

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Top Artists by Songs Submitted</CardTitle>
			</CardHeader>
			<CardContent className="px-1 sm:px-6">
				<div className="flex items-center justify-between mb-4 px-1 sm:px-0">
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Show:</span>
						<Select
							value={itemsPerPage.toString()}
							onValueChange={(value) => setItemsPerPage(Number(value))}
						>
							<SelectTrigger className="w-[80px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5">5</SelectItem>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="25">25</SelectItem>
								<SelectItem value="50">50</SelectItem>
								<SelectItem value="100">100</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="h-8 w-8"
						>
							<ChevronLeftIcon className="h-4 w-4" />
						</Button>
						<span className="text-sm text-muted-foreground">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="h-8 w-8"
						>
							<ChevronRightIcon className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div className="overflow-x-auto">
					<Table className="w-full table-fixed">
						<TableHeader>
							<TableRow className="bg-secondary">
								<TableHead className="w-[15%] text-center">
									Rank
								</TableHead>
								<TableHead className="w-[60%]">Artist</TableHead>
								<TableHead className="w-[25%] text-right">
									Songs
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{currentArtists.map((artist, index) => (
								<TableRow key={artist.name}>
									<TableCell className="text-center font-bold">
										{startIndex + index + 1}
									</TableCell>
									<TableCell className="font-medium">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="truncate">{artist.name}</div>
												</TooltipTrigger>
												<TooltipContent>{artist.name}</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</TableCell>
									<TableCell className="text-right">
										{artist.songs.length}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

