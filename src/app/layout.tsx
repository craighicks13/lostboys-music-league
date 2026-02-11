import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Space_Grotesk, DM_Sans } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	variable: '--font-heading',
	display: 'swap',
});

const dmSans = DM_Sans({
	subsets: ['latin'],
	variable: '--font-body',
	display: 'swap',
});

export const metadata: Metadata = {
	title: {
		template: '%s | Music League',
		default: 'Music League - Social Music Discovery',
	},
	description:
		'Compete with friends by submitting songs to themed rounds, vote on your favorites, and climb the leaderboard.',
	openGraph: {
		type: 'website',
		siteName: 'Music League',
		title: 'Music League - Social Music Discovery',
		description:
			'Compete with friends by submitting songs to themed rounds, vote on your favorites, and climb the leaderboard.',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Music League - Social Music Discovery',
		description:
			'Compete with friends by submitting songs to themed rounds, vote on your favorites, and climb the leaderboard.',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${spaceGrotesk.variable} ${dmSans.variable} font-sans`}>
				<Providers>
					<div className="min-h-screen flex flex-col bg-background pb-16 sm:pb-0">
						<Header />
						<Navigation />
						{children}
					</div>
				</Providers>
				<Analytics />
			</body>
		</html>
	);
}
