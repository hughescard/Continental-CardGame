import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  preferredDisplayName: string;
  lastVisitedRoomId: string | null;
  setPreferredDisplayName: (value: string) => void;
  setLastVisitedRoomId: (roomId: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      preferredDisplayName: '',
      lastVisitedRoomId: null,
      setPreferredDisplayName: (value) => set({ preferredDisplayName: value }),
      setLastVisitedRoomId: (roomId) => set({ lastVisitedRoomId: roomId }),
    }),
    {
      name: 'continental-session',
      partialize: (state) => ({
        preferredDisplayName: state.preferredDisplayName,
        lastVisitedRoomId: state.lastVisitedRoomId,
      }),
    },
  ),
);
