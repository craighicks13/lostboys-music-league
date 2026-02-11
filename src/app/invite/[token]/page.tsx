'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/app/providers';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function InvitePage() {
	const params = useParams<{ token: string }>();
	const router = useRouter();
	const { data, isPending } = useSession();
	const token = params.token;

	const previewQuery = trpc.invite.getByToken.useQuery(
		{ token },
		{ enabled: !!token }
	);

	const joinMutation = trpc.invite.joinByLink.useMutation({
		onSuccess: (data) => {
			toast.success('Joined league successfully');
			router.push(`/leagues/${data.leagueId}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (previewQuery.isLoading || isPending) {
		return (
			<main className="flex-1 flex items-center justify-center px-4 py-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64 mt-2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</main>
		);
	}

	if (previewQuery.error || !previewQuery.data) {
		return (
			<main className="flex-1 flex items-center justify-center px-4 py-8">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Invalid Invite</CardTitle>
						<CardDescription>
							This invite is invalid or has expired.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => router.push('/')}
						>
							Go Home
						</Button>
					</CardContent>
				</Card>
			</main>
		);
	}

	const { leagueName, leagueDescription } = previewQuery.data;

	return (
		<main className="flex-1 flex items-center justify-center px-4 py-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{leagueName}</CardTitle>
					{leagueDescription && (
						<CardDescription>{leagueDescription}</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							You have been invited to join this league.
						</p>

						{joinMutation.error && (
							<p className="text-sm text-destructive">
								{joinMutation.error.message}
							</p>
						)}

						{data?.user ? (
							<Button
								className="w-full"
								onClick={() => joinMutation.mutate({ token })}
								disabled={joinMutation.isPending}
							>
								{joinMutation.isPending
									? 'Joining...'
									: 'Join League'}
							</Button>
						) : (
							<Button
								className="w-full"
								onClick={() =>
									router.push(
										`/auth/signin?callbackUrl=/invite/${token}`
									)
								}
							>
								Sign in to join
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
