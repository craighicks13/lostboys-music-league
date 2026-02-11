'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/app/providers';
import { joinByCodeSchema } from '@/lib/validators/invite';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function JoinLeaguePage() {
	const router = useRouter();
	const [code, setCode] = useState('');
	const [validationError, setValidationError] = useState<string | null>(null);

	const joinMutation = trpc.invite.joinByCode.useMutation({
		onSuccess: (data) => {
			toast.success('Joined league successfully');
			router.push(`/leagues/${data.leagueId}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setValidationError(null);

		const result = joinByCodeSchema.safeParse({ code });
		if (!result.success) {
			setValidationError(result.error.errors[0]?.message ?? 'Invalid code');
			return;
		}

		joinMutation.mutate({ code: result.data.code });
	}

	return (
		<main className="flex-1 flex items-center justify-center px-4 py-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Join a League</CardTitle>
					<CardDescription>
						Enter an invite code to join an existing league.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="code">Invite Code</Label>
							<Input
								id="code"
								value={code}
								onChange={(e) => {
									setCode(e.target.value);
									setValidationError(null);
								}}
								placeholder="Enter invite code"
								maxLength={20}
							/>
						</div>

						{validationError && (
							<p className="text-sm text-destructive">
								{validationError}
							</p>
						)}

						{joinMutation.error && (
							<p className="text-sm text-destructive">
								{joinMutation.error.message}
							</p>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={joinMutation.isPending || !code}
						>
							{joinMutation.isPending
								? 'Joining...'
								: 'Join League'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
