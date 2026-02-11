"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Loader2, ChevronUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface LeagueChatProps {
  leagueId: string;
}

function formatTimestamp(date: Date): string {
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
    hour: "numeric",
    minute: "2-digit",
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

export function LeagueChat({ leagueId }: LeagueChatProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const { data: group, isLoading: groupLoading } =
    trpc.chat.getOrCreateGroup.useQuery({ leagueId });

  const utils = trpc.useUtils();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.chat.getMessages.useInfiniteQuery(
    { chatGroupId: group?.id ?? "", limit: 50 },
    {
      enabled: !!group?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: 5000,
    }
  );

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setShouldAutoScroll(true);
      utils.chat.getMessages.invalidate({ chatGroupId: group?.id ?? "" });
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to send message");
    },
  });

  // Flatten paginated messages and reverse so oldest are first (top)
  const allMessages = messagesData?.pages
    ? [...messagesData.pages.flatMap((page) => page.messages)].reverse()
    : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, shouldAutoScroll]);

  // Detect if user has scrolled up (disable auto-scroll)
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !group?.id || sendMessage.isPending) return;
    sendMessage.mutate({ chatGroupId: group.id, content: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (groupLoading) {
    return (
      <div className="flex flex-col h-full space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground">Unable to load chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <ChevronUp className="size-4 mr-1.5" />
              )}
              Load older messages
            </Button>
          </div>
        )}

        {messagesLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!messagesLoading && allMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-2">
              <MessageCircle className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="text-lg font-semibold">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start the conversation with your league!
              </p>
            </div>
          </div>
        )}

        {allMessages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3 py-1.5">
            <Avatar size="sm" className="mt-0.5 shrink-0">
              <AvatarImage src={msg.userImage ?? undefined} alt={msg.userName ?? "User"} />
              <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium truncate">
                  {msg.userName ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(new Date(msg.createdAt))}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            maxLength={5000}
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex field-sizing-content min-h-11 max-h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            disabled={sendMessage.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || sendMessage.isPending}
            className="shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
        {sendMessage.error && (
          <p className="text-xs text-red-500 mt-1">
            {sendMessage.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
