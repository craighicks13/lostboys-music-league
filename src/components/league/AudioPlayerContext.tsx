"use client";

import { createContext, useContext, useCallback, useRef } from "react";

interface AudioPlayerContextType {
  registerPlay: (audio: HTMLAudioElement) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType>({
  registerPlay: () => {},
});

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const registerPlay = useCallback((audio: HTMLAudioElement) => {
    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    currentAudioRef.current = audio;
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ registerPlay }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}
