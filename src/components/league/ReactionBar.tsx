"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const EMOJI_OPTIONS = ["🔥", "❤️", "👏", "🎵", "💯", "😍", "🤔", "👀"];

interface ReactionBarProps {
  submissionId: string;
}

export function ReactionBar({ submissionId }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: reactions } = trpc.reaction.getBySubmission.useQuery({
    submissionId,
  });

  const toggle = trpc.reaction.toggle.useMutation({
    onMutate: async ({ emoji }) => {
      await utils.reaction.getBySubmission.cancel({ submissionId });

      const previous = utils.reaction.getBySubmission.getData({
        submissionId,
      });

      utils.reaction.getBySubmission.setData({ submissionId }, (old) => {
        if (!old) return old;

        const existing = old.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.userReacted) {
            // Remove user reaction
            if (existing.count <= 1) {
              return old.filter((r) => r.emoji !== emoji);
            }
            return old.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, userReacted: false }
                : r
            );
          } else {
            // Add user reaction to existing emoji
            return old.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, userReacted: true }
                : r
            );
          }
        }
        // New emoji
        return [...old, { emoji, count: 1, userReacted: true }];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.reaction.getBySubmission.setData(
          { submissionId },
          context.previous
        );
      }
    },
    onSettled: () => {
      utils.reaction.getBySubmission.invalidate({ submissionId });
    },
  });

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;

    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  function handleToggle(emoji: string) {
    toggle.mutate({ submissionId, emoji });
    setPickerOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions?.map((r) => (
        <Button
          key={r.emoji}
          variant={r.userReacted ? "outline" : "ghost"}
          size="xs"
          className={
            r.userReacted
              ? "bg-primary/10 border-primary/50 hover:bg-primary/20"
              : undefined
          }
          onClick={() => handleToggle(r.emoji)}
        >
          <span className="text-xs leading-none">{r.emoji}</span>
          <span className="text-xs tabular-nums">{r.count}</span>
        </Button>
      ))}

      <div className="relative" ref={pickerRef}>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Add reaction"
        >
          <Plus className="size-3" />
        </Button>

        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-1 z-50 flex gap-0.5 rounded-lg border bg-popover p-1.5 shadow-md">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className="rounded p-1 text-base leading-none hover:bg-accent transition-colors cursor-pointer"
                onClick={() => handleToggle(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
