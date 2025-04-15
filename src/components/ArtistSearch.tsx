import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import ReactConfetti from 'react-confetti';
import { Artist } from '@/lib/types';
import { useWindowSize } from '@/lib/hooks';

interface ArtistSearchProps {
	artists: Artist[];
}

export function ArtistSearch({ artists }: ArtistSearchProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [searchResult, setSearchResult] = useState<{
		found: boolean;
		artist?: Artist;
	}>({ found: false });
	const [showDialog, setShowDialog] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const { width, height } = useWindowSize();

	const handleSearch = () => {
		if (!searchTerm.trim()) return;

		const term = searchTerm.trim().toLowerCase();
		const foundArtist = artists.find((artist) =>
			artist.name.toLowerCase().includes(term)
		);

		const found = !!foundArtist;
		setSearchResult({ found, artist: foundArtist });
		setShowDialog(true);

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

			<div className="flex gap-2">
				<Input
					placeholder="Enter artist name..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<Button onClick={handleSearch}>Search</Button>
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
								{`Warning! The artist "${searchResult.artist?.name}" is already in the list.`}
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
								{`Congratulations! "${searchTerm}" is not in the list yet.`}
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
