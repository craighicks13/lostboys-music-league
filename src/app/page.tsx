'use client';

import SearchToggle from '@/components/SearchToggle';
import { ArtistTable } from '@/components/ArtistTable';
import { MusicLoader } from '@/components/MusicLoader';
import { usePlaylistData } from '@/lib/hooks';
import { trpc } from './providers';

export default function Home() {
	// Use trpc query with React Query
	const { data: playlistData, error: queryError } =
		trpc.spotify.getPlaylist.useQuery(undefined, {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 5 * 60 * 1000, // 5 minutes
		});

	// Use our custom hook to process data and handle errors
	const { artists, allSongs, error, isLoading } = usePlaylistData(
		playlistData,
		queryError
	);

	return (
		<main className="flex min-h-screen flex-col items-center p-8 gap-8">
			<div className="container max-w-5xl">
				<h1 className="text-4xl font-bold text-center mb-8">
					Lost Boys Music League
				</h1>

				{error && (
					<div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
						<p>{error}</p>
					</div>
				)}

				<div className="grid grid-cols-1 gap-8 md:gap-12">
					<SearchToggle artists={artists} allSongs={allSongs} />

					{isLoading ? (
						<MusicLoader />
					) : (
						<ArtistTable artists={artists} />
					)}
				</div>
			</div>
		</main>
	);
}
