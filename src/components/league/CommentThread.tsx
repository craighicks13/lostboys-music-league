"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle,
  SendHorizontal,
  Trash2,
  EyeOff,
  Loader2,
} from "lucide-react";

interface CommentThreadProps {
  submissionId: string;
  userRole?: string;
  currentUserId?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CommentThread({
  submissionId,
  userRole,
  currentUserId,
}: CommentThreadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();

  const { data: comments, isLoading } =
    trpc.comment.getBySubmission.useQuery(
      { submissionId },
      { enabled: isOpen }
    );

  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      setContent("");
      utils.comment.getBySubmission.invalidate({ submissionId });
    },
  });

  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.getBySubmission.invalidate({ submissionId });
    },
  });

  const hideComment = trpc.comment.hide.useMutation({
    onSuccess: () => {
      utils.comment.getBySubmission.invalidate({ submissionId });
    },
  });

  const isModeratorRole = userRole === "owner" || userRole === "admin";
  const commentCount = comments?.length ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || createComment.isPending) return;
    createComment.mutate({ submissionId, content: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="border-t border-border/50 pt-2 mt-2">
      {/* Collapsible toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessageCircle className="size-3.5" />
        {isOpen
          ? `Comments${commentCount > 0 ? ` (${commentCount})` : ""}`
          : commentCount > 0
            ? `Comments (${commentCount})`
            : "Add comment..."}
      </button>

      {/* Expanded thread */}
      {isOpen && (
        <div className="mt-2 space-y-2">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="size-6 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-full max-w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && commentCount === 0 && (
            <p className="text-xs text-muted-foreground py-1">
              No comments yet. Be the first!
            </p>
          )}

          {/* Comment list */}
          {!isLoading && comments && comments.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {comments.map((comment) => {
                const isAuthor = currentUserId === comment.userId;
                const canDelete = isAuthor || isModeratorRole;
                const canHide = isModeratorRole && !comment.hidden;

                return (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2 group/comment"
                  >
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      <AvatarImage
                        src={comment.userImage ?? undefined}
                        alt={comment.userName ?? "User"}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(comment.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {comment.userName ?? "Unknown"}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatRelativeTime(new Date(comment.createdAt))}
                        </span>
                      </div>
                      {comment.hidden ? (
                        <p className="text-xs text-muted-foreground italic">
                          [Comment hidden by moderator]
                        </p>
                      ) : (
                        <p className="text-xs whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      )}
                    </div>
                    {/* Action buttons */}
                    {(canDelete || canHide) && (
                      <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover/comment:opacity-100 transition-opacity shrink-0">
                        {canHide && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5"
                            onClick={() =>
                              hideComment.mutate({ commentId: comment.id })
                            }
                            disabled={hideComment.isPending}
                            title="Hide comment"
                          >
                            <EyeOff className="size-3 text-muted-foreground" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5"
                            onClick={() =>
                              deleteComment.mutate({ commentId: comment.id })
                            }
                            disabled={deleteComment.isPending}
                            title="Delete comment"
                          >
                            <Trash2 className="size-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment..."
              rows={1}
              maxLength={2000}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex field-sizing-content min-h-8 max-h-24 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={createComment.isPending}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              disabled={!content.trim() || createComment.isPending}
            >
              {createComment.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <SendHorizontal className="size-3.5" />
              )}
            </Button>
          </form>
          {createComment.error && (
            <p className="text-[10px] text-red-500">
              {createComment.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
