import { create } from 'zustand';
import type { Track, PlaybackInfo } from '../types';

interface PlayerState {
  currentTrack: Track | null;
  playbackInfo: PlaybackInfo | null;
  isPlaying: boolean;
  queue: Track[];
  queueIndex: number;
  setCurrentTrack: (track: Track, playbackInfo: PlaybackInfo) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  playbackInfo: null,
  isPlaying: false,
  queue: [],
  queueIndex: 0,

  setCurrentTrack: (track, playbackInfo) =>
    set({
      currentTrack: track,
      playbackInfo,
      isPlaying: true,
    }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      queueIndex: startIndex,
    }),

  playNext: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < queue.length - 1) {
      set({ queueIndex: queueIndex + 1 });
    }
  },

  playPrevious: () => {
    const { queueIndex } = get();
    if (queueIndex > 0) {
      set({ queueIndex: queueIndex - 1 });
    }
  },

  clearPlayer: () =>
    set({
      currentTrack: null,
      playbackInfo: null,
      isPlaying: false,
      queue: [],
      queueIndex: 0,
    }),
}));
