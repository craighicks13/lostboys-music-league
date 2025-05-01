'use client';

import { ThemeToggle } from './ThemeToggle';

export function Header() {
	return (
		<header className="sticky top-0 z-10 w-full py-3 px-4 md:px-8 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
			<div className="flex items-center gap-2">
				<h1 className="text-lg font-bold">Lost Boys Music League</h1>
			</div>
			<ThemeToggle />
		</header>
	);
}
