import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Lost Boys Music League',
	description:
		'Browse the Lost Boys Music League catalog and search for artists',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={inter.className}>
				<Providers>
					<div className="min-h-screen flex flex-col bg-background">
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
