'use client';

import { useState, useEffect } from 'react';
import { fetchAndParseCSV } from '@/lib/csvParser';
import { Artist } from '@/lib/types';
import { ArtistTable } from '@/components/ArtistTable';
import { ArtistSearch } from '@/components/ArtistSearch';

export default function Home() {
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadData() {
			try {
				const { artists } = await fetchAndParseCSV();
				setArtists(artists);
			} catch (error) {
				console.error('Failed to load data:', error);
			} finally {
				setLoading(false);
			}
		}

		loadData();
	}, []);

	return (
		<main className="flex min-h-screen flex-col items-center p-8 gap-8">
			<div className="container max-w-5xl">
				<h1 className="text-4xl font-bold text-center mb-8">
					Lost Boys Music League
				</h1>

				<div className="grid grid-cols-1 gap-8 md:gap-12">
					<ArtistSearch artists={artists} />

					{loading ? (
						<div className="flex justify-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-900"></div>
						</div>
					) : (
						<ArtistTable artists={artists} />
					)}
				</div>
			</div>
		</main>
	);
}
