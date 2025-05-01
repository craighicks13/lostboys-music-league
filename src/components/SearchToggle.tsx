'use client';

import { useEffect, useState } from 'react';
import { Artist, Song } from '@/lib/types';
import { ArtistSearch } from './ArtistSearch';
import SongSearch from '@/components/SongSearch';
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '@/components/ui/tabs';

interface SearchToggleProps {
	artists: Artist[];
	allSongs: Song[];
}

type SearchMode = 'artist' | 'song';

export default function SearchToggle({
	artists,
	allSongs,
}: SearchToggleProps) {
	// Initialize with the stored preference or default to 'artist'
	const [searchMode, setSearchMode] = useState<SearchMode>('artist');

	// Load the preference from localStorage on component mount
	useEffect(() => {
		try {
			const storedMode = localStorage.getItem('searchMode');
			if (storedMode === 'artist' || storedMode === 'song') {
				setSearchMode(storedMode as SearchMode);
			}
		} catch (error) {
			console.error('Error accessing localStorage:', error);
		}
	}, []);

	// Save preference to localStorage whenever it changes
	useEffect(() => {
		try {
			const currentStoredMode = localStorage.getItem('searchMode');
			// Only update localStorage if the value is different
			if (currentStoredMode !== searchMode) {
				localStorage.setItem('searchMode', searchMode);
			}
		} catch (error) {
			console.error('Error writing to localStorage:', error);
		}
	}, [searchMode]);

	const handleTabChange = (value: string) => {
		if (value === 'artist' || value === 'song') {
			setSearchMode(value as SearchMode);
		}
	};

	return (
		<div className="flex flex-col gap-6 w-full max-w-md mx-auto">
			<Tabs
				value={searchMode}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="w-full">
					<TabsTrigger value="artist" className="flex-1">
						Artist Search
					</TabsTrigger>
					<TabsTrigger value="song" className="flex-1">
						Song Search
					</TabsTrigger>
				</TabsList>

				<TabsContent value="artist">
					<ArtistSearch artists={artists} />
				</TabsContent>

				<TabsContent value="song">
					<SongSearch allSongs={allSongs} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
