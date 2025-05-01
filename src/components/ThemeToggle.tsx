'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Switch } from './ui/switch';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Wait for component to mount to avoid hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	// If system preference is dark, the switch should be on
	const isDarkMode =
		mounted &&
		(theme === 'dark' ||
			(theme === 'system' && resolvedTheme === 'dark'));

	// Toggle between dark and light mode
	const toggleTheme = () => {
		if (theme === 'system') {
			// If system, directly set to light/dark based on current resolved theme
			setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
		} else {
			// If already set to light/dark, toggle between them
			setTheme(theme === 'dark' ? 'light' : 'dark');
		}
	};

	if (!mounted) return null;

	return (
		<div className="flex items-center gap-2">
			<Sun className="h-4 w-4 text-muted-foreground" />
			<Switch
				checked={isDarkMode}
				onCheckedChange={toggleTheme}
				aria-label="Toggle dark mode"
			/>
			<Moon className="h-4 w-4 text-muted-foreground" />
		</div>
	);
}
