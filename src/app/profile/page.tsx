'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AvatarUpload, ProfileStats } from '@/components/profile';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
	const { data, isPending } = useSession();
	const router = useRouter();

	const [name, setName] = useState('');
	const [streamingPreference, setStreamingPreference] = useState('spotify');
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!isPending && !data?.user) {
			router.push('/auth/signin');
		}
	}, [isPending, data, router]);

	useEffect(() => {
		if (data?.user) {
			setName(data.user.name ?? '');
			setAvatarUrl(data.user.image ?? null);
		}
	}, [data]);

	if (isPending) {
		return (
			<main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
				<Card>
					<CardHeader>
						<div className="h-7 w-24 rounded bg-muted animate-pulse" />
						<div className="h-4 w-64 rounded bg-muted animate-pulse" />
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							<div className="flex flex-col items-center gap-2">
								<div className="size-20 rounded-full bg-muted animate-pulse" />
							</div>
							<div className="space-y-2">
								<div className="h-4 w-28 rounded bg-muted animate-pulse" />
								<div className="h-10 w-full rounded bg-muted animate-pulse" />
							</div>
							<div className="space-y-2">
								<div className="h-4 w-16 rounded bg-muted animate-pulse" />
								<div className="h-10 w-full rounded bg-muted animate-pulse" />
							</div>
							<div className="h-10 w-full rounded bg-muted animate-pulse" />
						</div>
					</CardContent>
				</Card>
			</main>
		);
	}

	if (!data?.user) {
		return null;
	}

	return (
		<main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						Manage your account settings and preferences.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{/* Avatar */}
						<div className="flex flex-col items-center gap-2">
							<AvatarUpload
								currentImage={avatarUrl}
								onUpload={(url) => setAvatarUrl(url)}
							/>
							<p className="text-xs text-muted-foreground">
								Click to upload a new avatar
							</p>
						</div>

						{/* Display Name */}
						<div className="space-y-2">
							<label
								htmlFor="name"
								className="text-sm font-medium"
							>
								Display Name
							</label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your display name"
							/>
						</div>

						{/* Email (read-only) */}
						<div className="space-y-2">
							<label
								htmlFor="email"
								className="text-sm font-medium"
							>
								Email
							</label>
							<Input
								id="email"
								value={data.user.email ?? ''}
								disabled
								className="opacity-60"
							/>
						</div>

						{/* Streaming Preference */}
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Streaming Preference
							</label>
							<Select
								value={streamingPreference}
								onValueChange={setStreamingPreference}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a streaming service" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="spotify">
										Spotify
									</SelectItem>
									<SelectItem value="apple-music">
										Apple Music
									</SelectItem>
									<SelectItem value="none">None</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Save Button */}
						<Button className="w-full">Save Changes</Button>
					</div>
				</CardContent>
			</Card>

			<Separator className="my-8" />

			<ProfileStats />
		</main>
	);
}
