'use client';

import SearchToggle from '@/components/SearchToggle';
import { ArtistTable } from '@/components/ArtistTable';
import { MusicLoader } from '@/components/MusicLoader';
import { Header } from '@/components/Header';
import { usePlaylistData } from '@/lib/hooks';
import { trpc } from './providers';

export default function Home() {
	// Use trpc query with React Query
	const { data: playlistData, error: queryError } =
		trpc.spotify.getPlaylist.useQuery(undefined, {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 24 * 60 * 60 * 1000, // 24 hours
		});

	// Use our custom hook to process data and handle errors
	const { artists, allSongs, error, isLoading } = usePlaylistData(
		playlistData,
		queryError
	);

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<Header />
			<main className="flex-1 flex flex-col items-center p-8 gap-8">
				<div className="container max-w-5xl">
					<h1 className="text-4xl font-bold text-center mb-8">
						Lost Boys Music League
					</h1>

					{error && (
						<div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600">
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
		</div>
	);
}
