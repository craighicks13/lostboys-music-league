'use client';

import { TopArtists } from '@/components/TopArtists';
import { TopSongs } from '@/components/TopSongs';
import { MusicLoader } from '@/components/MusicLoader';
import { usePlaylistData } from '@/lib/hooks';
import { trpc } from '../providers';

export default function AnalyticsPage() {
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
		<main className="flex-1 flex flex-col items-center p-8 gap-8">
			<div className="container max-w-5xl">
				{error && (
					<div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600">
						<p>{error}</p>
					</div>
				)}

				{isLoading ? (
					<MusicLoader />
				) : (
					<div className="grid grid-cols-1 gap-8 md:gap-12">
						{/* Stats panels */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<TopArtists artists={artists} />
							<TopSongs allSongs={allSongs} />
						</div>
					</div>
				)}
			</div>
		</main>
	);
}

