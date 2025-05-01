'use client';

import { ThemeToggle } from './ThemeToggle';
import { Music } from 'lucide-react';
import Link from 'next/link';

export function Header() {
	return (
		<header className="sticky top-0 z-10 w-full py-3 px-4 md:px-8 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
			<div className="flex items-center gap-2">
				<h1 className="text-lg font-bold">Lost Boys Music League</h1>
				<Link
					href="https://open.spotify.com/playlist/6oicpmZcmaD6rqjhfqge7l"
					target="_blank"
					className="opacity-60 hover:opacity-100 transition-opacity"
					title="Open Spotify Playlist"
				>
					<Music size={16} />
				</Link>
			</div>
			<ThemeToggle />
		</header>
	);
}
