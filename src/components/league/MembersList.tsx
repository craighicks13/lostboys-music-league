"use client";

import { useState } from "react";
import { MoreHorizontal, ShieldCheck, ShieldMinus, UserX, Ban, UserCheck, Users } from "lucide-react";
import { trpc } from "@/app/providers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface MembersListProps {
  leagueId: string;
  userRole: string;
}

function roleBadge(role: string) {
  switch (role) {
    case "owner":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          owner
        </Badge>
      );
    case "admin":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          admin
        </Badge>
      );
    default:
      return <Badge variant="outline">member</Badge>;
  }
}

export function MembersList({ leagueId, userRole }: MembersListProps) {
  const utils = trpc.useUtils();
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [banningMember, setBanningMember] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [banReason, setBanReason] = useState("");

  const { data: members, isLoading } = trpc.league.getMembers.useQuery({
    leagueId,
  });

  const updateRole = trpc.league.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.league.getMembers.invalidate({ leagueId });
      utils.league.getById.invalidate({ id: leagueId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMember = trpc.league.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.league.getMembers.invalidate({ leagueId });
      utils.league.getById.invalidate({ id: leagueId });
      setRemovingMember(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const banMember = trpc.league.banMember.useMutation({
    onSuccess: () => {
      toast.success("Member banned");
      utils.league.getMembers.invalidate({ leagueId });
      setBanningMember(null);
      setBanReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unbanMember = trpc.league.unbanMember.useMutation({
    onSuccess: () => {
      toast.success("Member unbanned");
      utils.league.getMembers.invalidate({ leagueId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <Users className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">No members yet.</p>
      </div>
    );
  }

  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin";
  const canModerate = isOwner || isAdmin;

  return (
    <>
      <div className="divide-y rounded-md border">
        {members.map((member) => {
          const isBanned = !!member.bannedAt;

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 transition-colors hover:bg-accent/50 ${isBanned ? "opacity-60" : ""}`}
            >
              <Avatar>
                {member.image && (
                  <AvatarImage src={member.image} alt={member.name ?? ""} />
                )}
                <AvatarFallback>
                  {(member.name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.name ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {roleBadge(member.role)}
                {isBanned && (
                  <Badge variant="destructive">Banned</Badge>
                )}

                {canModerate && member.role !== "owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isBanned ? (
                        <DropdownMenuItem
                          onClick={() =>
                            unbanMember.mutate({
                              leagueId,
                              userId: member.userId,
                            })
                          }
                          disabled={unbanMember.isPending}
                        >
                          <UserCheck className="size-4 mr-2" />
                          Unban Member
                        </DropdownMenuItem>
                      ) : (
                        <>
                          {isOwner && (
                            <>
                              {member.role === "admin" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateRole.mutate({
                                      leagueId,
                                      userId: member.userId,
                                      role: "member",
                                    })
                                  }
                                  disabled={updateRole.isPending}
                                >
                                  <ShieldMinus className="size-4 mr-2" />
                                  Demote to Member
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateRole.mutate({
                                      leagueId,
                                      userId: member.userId,
                                      role: "admin",
                                    })
                                  }
                                  disabled={updateRole.isPending}
                                >
                                  <ShieldCheck className="size-4 mr-2" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {!(isAdmin && member.role === "admin") && (
                            <>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setBanningMember({
                                    userId: member.userId,
                                    name: member.name ?? "this member",
                                  })
                                }
                              >
                                <Ban className="size-4 mr-2" />
                                Ban from League
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setRemovingMember({
                                    userId: member.userId,
                                    name: member.name ?? "this member",
                                  })
                                }
                              >
                                <UserX className="size-4 mr-2" />
                                Remove from League
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remove member dialog */}
      <AlertDialog
        open={!!removingMember}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.name} from this
              league? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removingMember) {
                  removeMember.mutate({
                    leagueId,
                    userId: removingMember.userId,
                  });
                }
              }}
              disabled={removeMember.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban member dialog */}
      <AlertDialog
        open={!!banningMember}
        onOpenChange={(open) => {
          if (!open) {
            setBanningMember(null);
            setBanReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban {banningMember?.name} from this
              league? They will not be able to participate until unbanned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Textarea
              id="ban-reason"
              placeholder="Reason for banning..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1.5"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (banningMember) {
                  banMember.mutate({
                    leagueId,
                    userId: banningMember.userId,
                    reason: banReason || undefined,
                  });
                }
              }}
              disabled={banMember.isPending}
            >
              Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
