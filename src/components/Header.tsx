'use client';

import { ThemeToggle } from './ThemeToggle';
import { User, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from './ui/button';

export function Header() {
	const { data } = useSession();
	const router = useRouter();

	return (
		<header className="sticky top-0 z-10 w-full py-3 px-4 md:px-8 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
			<div className="flex items-center gap-2">
				<Link
					href="/"
					className="text-base sm:text-lg font-bold hover:opacity-80 transition-opacity truncate"
				>
					Lost Boys Music League
				</Link>
			</div>
			<div className="flex items-center gap-3">
				{data?.user ? (
					<>
						<Link
							href="/profile"
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							{data.user.image ? (
								<Image
									src={data.user.image}
									alt={data.user.name ?? 'Avatar'}
									width={28}
									height={28}
									className="h-7 w-7 rounded-full object-cover"
								/>
							) : (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
									<User size={14} />
								</span>
							)}
							<span className="hidden sm:inline">
								{data.user.name ?? 'Profile'}
							</span>
						</Link>
						<Button
							variant="ghost"
							size="sm"
							onClick={async () => {
								await signOut();
								router.push('/');
							}}
						>
							<LogOut size={14} />
							<span className="hidden sm:inline ml-1">Sign Out</span>
						</Button>
					</>
				) : (
					<Button variant="outline" size="sm" asChild>
						<Link href="/auth/signin">Sign In</Link>
					</Button>
				)}
				<ThemeToggle />
			</div>
		</header>
	);
}
