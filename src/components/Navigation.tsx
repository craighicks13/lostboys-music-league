'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation() {
	const pathname = usePathname();

	const links = [
		{ href: '/search', label: 'Search' },
		{ href: '/analytics', label: 'Analytics' },
	];

	return (
		<nav className="border-b bg-card">
			<div className="container max-w-5xl mx-auto px-4">
				<div className="flex items-center justify-center gap-6 h-14">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								'px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
								pathname === link.href
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
	);
}

