import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  pendingRoomCode: string;
  musicEnabled: boolean;
  setPendingRoomCode: (value: string) => void;
  resetPendingRoomCode: () => void;
  setMusicEnabled: (value: boolean) => void;
  toggleMusicEnabled: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      pendingRoomCode: '',
      musicEnabled: true,
      setPendingRoomCode: (value) => set({ pendingRoomCode: value.toUpperCase() }),
      resetPendingRoomCode: () => set({ pendingRoomCode: '' }),
      setMusicEnabled: (value) => set({ musicEnabled: value }),
      toggleMusicEnabled: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
    }),
    {
      name: 'continental-ui',
      partialize: (state) => ({
        musicEnabled: state.musicEnabled,
      }),
    },
  ),
);
