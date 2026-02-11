"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { TrackMetadata } from "@/lib/services/music";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Pause } from "lucide-react";
import { useAudioPlayer } from "./AudioPlayerContext";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSeconds(secs: number): string {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackPreview({ track }: { track: TrackMetadata }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gracefully degrades: default context provides a no-op registerPlay
  const { registerPlay } = useAudioPlayer();

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  }, []);

  function handleEnded() {
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      registerPlay(audioRef.current);
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  // Listen for external pause (from AudioPlayerContext pausing this element)
  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <Card className={`py-3 ${isPlaying ? "border-l-primary border-l-2" : ""}`}>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4">
          {track.artworkUrl ? (
            <Image
              src={track.artworkUrl}
              alt={`${track.trackName} artwork`}
              width={64}
              height={64}
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded">
              <Music className="text-muted-foreground h-8 w-8" />
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate font-semibold">{track.trackName}</p>
            <p className="text-muted-foreground truncate text-sm">
              {track.artist}
              {track.album ? ` \u2022 ${track.album}` : ""}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {track.provider === "spotify" ? "Spotify" : "Apple Music"}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDuration(track.duration)}
              </span>
            </div>
          </div>

          {track.previewUrl ? (
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="icon"
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause preview" : "Play preview"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">No Preview</span>
          )}
        </div>

        {/* Progress bar — only shown when audio has been interacted with */}
        {track.previewUrl && (isPlaying || currentTime > 0) && (
          <div className="space-y-1">
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>{formatSeconds(currentTime)}</span>
              <span>{audioDuration > 0 ? formatSeconds(audioDuration) : formatDuration(track.duration)}</span>
            </div>
          </div>
        )}

        {track.previewUrl && (
          <audio
            ref={audioRef}
            src={track.previewUrl}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={handlePause}
          />
        )}
      </CardContent>
    </Card>
  );
}
