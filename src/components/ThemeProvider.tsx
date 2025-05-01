'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeProviderProps {
	children: React.ReactNode;
	attribute?: 'class' | 'data-theme' | 'data-mode';
	defaultTheme?: string;
	enableSystem?: boolean;
	storageKey?: string;
	forcedTheme?: string;
	disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
	children,
	...props
}: ThemeProviderProps) {
	const [mounted, setMounted] = useState(false);

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <>{children}</>;
	}

	return (
		<NextThemesProvider {...props}>{children}</NextThemesProvider>
	);
}
