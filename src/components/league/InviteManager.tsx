'use client';

import { useState } from 'react';
import { trpc } from '@/app/providers';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface InviteManagerProps {
	leagueId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InviteManager({
	leagueId,
	open,
	onOpenChange,
}: InviteManagerProps) {
	const utils = trpc.useUtils();
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const invitesQuery = trpc.invite.list.useQuery(
		{ leagueId },
		{ enabled: open }
	);

	const createMutation = trpc.invite.create.useMutation({
		onSuccess: () => {
			toast.success('Invite generated');
			utils.invite.list.invalidate({ leagueId });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const deleteMutation = trpc.invite.delete.useMutation({
		onSuccess: () => {
			toast.success('Invite deleted');
			utils.invite.list.invalidate({ leagueId });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	async function copyToClipboard(text: string, field: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedField(field);
			toast.success('Copied to clipboard');
			setTimeout(() => setCopiedField(null), 2000);
		} catch {
			toast.error('Failed to copy to clipboard');
		}
	}

	function getInviteLink(linkToken: string) {
		if (typeof window === 'undefined') return '';
		return `${window.location.origin}/invite/${linkToken}`;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Manage Invites</DialogTitle>
					<DialogDescription>
						Generate invite codes and links to share with others.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<Button
						onClick={() => createMutation.mutate({ leagueId })}
						disabled={createMutation.isPending}
						className="w-full"
					>
						{createMutation.isPending
							? 'Generating...'
							: 'Generate New Invite'}
					</Button>

					{createMutation.error && (
						<p className="text-sm text-destructive">
							{createMutation.error.message}
						</p>
					)}

					{createMutation.data && (
						<div className="space-y-3 rounded-md border p-4">
							<div className="space-y-1.5">
								<label className="text-sm font-medium">
									Invite Code
								</label>
								<div className="flex gap-2">
									<Input
										readOnly
										value={createMutation.data.code}
									/>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											copyToClipboard(
												createMutation.data!.code,
												'code'
											)
										}
									>
										{copiedField === 'code'
											? 'Copied'
											: 'Copy'}
									</Button>
								</div>
							</div>
							<div className="space-y-1.5">
								<label className="text-sm font-medium">
									Invite Link
								</label>
								<div className="flex gap-2">
									<Input
										readOnly
										value={getInviteLink(
											createMutation.data.linkToken
										)}
									/>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											copyToClipboard(
												getInviteLink(
													createMutation.data!
														.linkToken
												),
												'link'
											)
										}
									>
										{copiedField === 'link'
											? 'Copied'
											: 'Copy'}
									</Button>
								</div>
							</div>
						</div>
					)}

					<Separator />

					<div className="space-y-2">
						<h4 className="text-sm font-medium">
							Existing Invites
						</h4>

						{invitesQuery.isLoading && (
							<div className="space-y-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						)}

						{invitesQuery.error && (
							<p className="text-sm text-destructive">
								Failed to load invites.
							</p>
						)}

						{invitesQuery.data && invitesQuery.data.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No invites yet.
							</p>
						)}

						{invitesQuery.data?.map((invite) => (
							<div
								key={invite.id}
								className="flex items-center justify-between rounded-md border p-3"
							>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<code className="text-sm">
											{invite.code}
										</code>
										<Badge variant="secondary">
											{invite.uses ?? 0} uses
										</Badge>
									</div>
									{invite.expiresAt && (
										<p className="text-xs text-muted-foreground">
											Expires{' '}
											{new Date(
												invite.expiresAt
											).toLocaleDateString()}
										</p>
									)}
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() =>
										deleteMutation.mutate({
											inviteId: invite.id,
										})
									}
									disabled={deleteMutation.isPending}
								>
									Delete
								</Button>
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
