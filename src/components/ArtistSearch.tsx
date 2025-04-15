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
import { Artist } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ArtistSearchProps {
	artists: Artist[];
}

export function ArtistSearch({ artists }: ArtistSearchProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [suggestions, setSuggestions] = useState<Artist[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchResult, setSearchResult] = useState<{
		found: boolean;
		artist?: Artist;
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
		const matchingArtists = artists
			.filter((artist) => artist.name.toLowerCase().includes(term))
			.slice(0, 5); // Limit to 5 suggestions

		setSuggestions(matchingArtists);
		setShowSuggestions(matchingArtists.length > 0);
	}, [searchTerm, artists]);

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

	const handleSearch = (artist?: Artist) => {
		// If artist is provided directly (from suggestion), use it
		// Otherwise search for it using the searchTerm
		const termToSearch = artist ? artist.name : searchTerm.trim();

		if (!termToSearch) return;

		const foundArtist =
			artist ||
			artists.find((a) =>
				a.name.toLowerCase().includes(termToSearch.toLowerCase())
			);

		const found = !!foundArtist;
		setSearchResult({ found, artist: foundArtist });
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
				<h2 className="text-xl font-semibold">Artist Search</h2>
				<p className="text-sm text-muted-foreground">
					Check if an artist is already in the Lost Boys Music League
				</p>
			</div>

			<div className="flex flex-col gap-2 relative">
				<div className="flex gap-2">
					<Input
						placeholder="Enter artist name..."
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
									{suggestions.map((artist) => (
										<CommandItem
											key={artist.name}
											onSelect={() => {
												setSearchTerm(artist.name);
												handleSearch(artist);
											}}
											className="cursor-pointer"
										>
											{artist.name}
											<span className="ml-2 text-sm text-muted-foreground">
												({artist.songs.length} songs)
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
								Warning! The artist &quot;{searchResult.artist?.name}
								&quot; is already in the list.
							</p>
							<p className="mt-2">Songs by this artist:</p>
							<ul className="list-disc pl-6 mt-2">
								{searchResult.artist?.songs.map((song) => (
									<li key={song.id}>{song.song}</li>
								))}
							</ul>
						</div>
					) : (
						<div className="py-4">
							<p className="font-semibold text-emerald-500">
								Congratulations! &quot;{searchTerm}&quot; is not in
								the list yet.
							</p>
							<p className="mt-2">
								You can add this artist to the Lost Boys Music League!
							</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
