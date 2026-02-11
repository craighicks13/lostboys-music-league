'use client';

import { ThemeToggle } from './ThemeToggle';
import { Trophy, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from './ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navLinks = [
	{ href: '/leagues', label: 'Leagues', icon: Trophy },
	{ href: '/profile', label: 'Profile', icon: User },
];

export function Header() {
	const { data } = useSession();
	const router = useRouter();
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-50 w-full h-12 px-4 md:px-8 flex items-center justify-between border-b backdrop-blur-md bg-background/80 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:gradient-primary">
			{/* Left: Logo */}
			<Link
				href="/"
				className="font-[family-name:var(--font-heading)] font-bold text-lg hover:opacity-80 transition-opacity"
			>
				LBML
			</Link>

			{/* Center: Desktop nav links */}
			<nav className="hidden sm:flex items-center gap-1">
				{navLinks.map((link) => {
					const Icon = link.icon;
					const isActive =
						pathname === link.href ||
						pathname.startsWith(link.href + '/');
					return (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
								isActive
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground'
							)}
						>
							<Icon className="size-4" />
							{link.label}
						</Link>
					);
				})}
			</nav>

			{/* Right: Avatar dropdown or Sign In */}
			<div className="flex items-center">
				{data?.user ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel className="font-normal">
								<span className="text-sm font-medium">
									{data.user.name ?? 'User'}
								</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/profile" className="cursor-pointer">
									<User className="mr-2 size-4" />
									Profile
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<div className="px-2 py-1.5">
								<ThemeToggle />
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer"
								onSelect={async () => {
									await signOut();
									router.push('/');
								}}
							>
								<LogOut className="mr-2 size-4" />
								Sign Out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<Button variant="outline" size="sm" asChild>
						<Link href="/auth/signin">Sign In</Link>
					</Button>
				)}
			</div>
		</header>
	);
}
