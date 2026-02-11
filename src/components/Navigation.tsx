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

	return (
		<nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-t border-white/10 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:gradient-primary">
			<div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
				{links.map((link) => {
					const isActive =
						pathname === link.href ||
						pathname.startsWith(link.href + '/');
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
	);
}
