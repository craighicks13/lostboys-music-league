'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
	{ href: '/leagues', label: 'Leagues', icon: Trophy },
	{ href: '/profile', label: 'Profile', icon: User },
];

export function Navigation() {
	const pathname = usePathname();

	if (pathname === '/') return null;

	return (
		<>
			{/* Desktop top nav */}
			<nav className="hidden sm:block border-b bg-card">
				<div className="container max-w-5xl mx-auto px-4">
					<div className="flex items-center justify-center gap-6 h-14">
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									'px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
									pathname === link.href || pathname.startsWith(link.href + '/')
										? 'bg-accent text-accent-foreground'
										: 'text-muted-foreground'
								)}
							>
								{link.label}
							</Link>
						))}
					</div>
				</div>
			</nav>

			{/* Mobile bottom nav bar */}
			<nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
				<div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
					{links.map((link) => {
						const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
						const Icon = link.icon;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									'flex flex-col items-center justify-center gap-1 min-w-[4rem] h-12 rounded-lg transition-colors',
									isActive
										? 'text-primary'
										: 'text-muted-foreground'
								)}
							>
								<Icon className="size-5" />
								<span className="text-[10px] font-medium leading-none">
									{link.label}
								</span>
							</Link>
						);
					})}
				</div>
			</nav>

		</>
	);
}
