'use client';

import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWindowSize } from '@/lib/hooks';
import { Song } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface SongSearchProps {
	allSongs: Song[];
}

export default function SongSearch({ allSongs }: SongSearchProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [suggestions, setSuggestions] = useState<Song[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchResult, setSearchResult] = useState<{
		found: boolean;
		song?: Song;
	}>({ found: false });
	const [showDialog, setShowDialog] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const { width, height } = useWindowSize();
	const commandRef = useRef<HTMLDivElement>(null);

	// Update suggestions as user types
	useEffect(() => {
		if (!searchTerm.trim()) {
			setSuggestions([]);
			return;
		}

		const term = searchTerm.trim().toLowerCase();
		const matchingSongs = allSongs
			.filter((song) => song.song.toLowerCase().includes(term))
			.slice(0, 5); // Limit to 5 suggestions

		// Filter out duplicates by ID
		const uniqueSongs: Song[] = [];
		const songIds = new Set<string>();

		matchingSongs.forEach((song) => {
			if (!songIds.has(song.id)) {
				songIds.add(song.id);
				uniqueSongs.push(song);
			}
		});

		setSuggestions(uniqueSongs);
		setShowSuggestions(uniqueSongs.length > 0);
	}, [searchTerm, allSongs]);

	// Close suggestions dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				commandRef.current &&
				!commandRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleSearch = (song?: Song) => {
		// If song is provided directly (from suggestion), use it
		// Otherwise search for it using the searchTerm
		const termToSearch = song ? song.song : searchTerm.trim();

		if (!termToSearch) return;

		const foundSong =
			song ||
			allSongs.find((s) =>
				s.song.toLowerCase().includes(termToSearch.toLowerCase())
			);

		const found = !!foundSong;
		setSearchResult({ found, song: foundSong });
		setShowDialog(true);
		setShowSuggestions(false);

		if (!found) {
			setShowConfetti(true);
			// Turn off confetti after a few seconds
			setTimeout(() => setShowConfetti(false), 5000);
		}
	};

	return (
		<div className="flex flex-col gap-4 w-full max-w-md mx-auto">
			<div className="space-y-2">
				<h2 className="text-xl font-semibold">Song Search</h2>
				<p className="text-sm text-muted-foreground">
					Check if a song is already in the Lost Boys Music League
				</p>
			</div>

			<div className="flex flex-col gap-2 relative">
				<div className="flex gap-2">
					<Input
						placeholder="Enter song title..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							if (e.target.value.trim()) {
								setShowSuggestions(true);
							}
						}}
						onKeyUp={(e) => {
							if (e.key === 'Enter') {
								handleSearch();
								setShowSuggestions(false);
							}
						}}
						autoComplete="off"
					/>
					<Button
						onClick={() => {
							handleSearch();
							setShowSuggestions(false);
						}}
					>
						Search
					</Button>
				</div>

				{/* Autocomplete suggestions */}
				{showSuggestions && (
					<div
						ref={commandRef}
						className="absolute top-full left-0 right-0 z-10 mt-1 border rounded-md bg-background shadow-md"
					>
						<Command>
							<CommandList>
								<CommandEmpty>No results found</CommandEmpty>
								<CommandGroup heading="Suggestions">
									{suggestions.map((song, index) => (
										<CommandItem
											key={`${song.id}-${index}`}
											onSelect={() => {
												setSearchTerm(song.song);
												handleSearch(song);
											}}
											className="cursor-pointer"
										>
											{song.song}
											<span className="ml-2 text-sm text-muted-foreground">
												({song.artist})
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</div>
				)}
			</div>

			{showConfetti && (
				<ReactConfetti width={width} height={height} />
			)}

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Search Results</DialogTitle>
					</DialogHeader>

					{searchResult.found ? (
						<div className="py-4">
							<p className="font-semibold text-amber-500">
								Warning! The song &quot;{searchResult.song?.song}
								&quot; is already in the list.
							</p>
							<p className="mt-2">Song details:</p>
							<div className="mt-2 grid grid-cols-2 gap-2">
								<div className="font-medium">Artist:</div>
								<div>{searchResult.song?.artist}</div>
								<div className="font-medium">Album:</div>
								<div>{searchResult.song?.album}</div>
								<div className="font-medium">Release Date:</div>
								<div>{searchResult.song?.albumDate}</div>
							</div>
						</div>
					) : (
						<div className="py-4">
							<p className="font-semibold text-emerald-500">
								Congratulations! &quot;{searchTerm}&quot; is not in
								the list yet.
							</p>
							<p className="mt-2">
								You can add this song to the Lost Boys Music League!
							</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
