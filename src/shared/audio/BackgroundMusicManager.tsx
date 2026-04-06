import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  backgroundMusicController,
  type BackgroundMusicScene,
} from '@/shared/audio/background-music';
import { useUiStore } from '@/store/ui/ui-store';

function resolveScene(pathname: string): BackgroundMusicScene {
  if (pathname.startsWith('/game/')) {
    return 'game';
  }

  if (pathname === '/') {
    return 'menu';
  }

  return 'silent';
}

export function BackgroundMusicManager() {
  const location = useLocation();
  const musicEnabled = useUiStore((state) => state.musicEnabled);
  const scene = resolveScene(location.pathname);

  useEffect(() => {
    backgroundMusicController.setEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    backgroundMusicController.setScene(scene);
  }, [scene]);

  useEffect(() => {
    function unlockAudio() {
      if (document.visibilityState === 'hidden') {
        void backgroundMusicController.hardStop();
        return;
      }

      void backgroundMusicController.primeAndResume();
    }

    function handlePageHide() {
      void backgroundMusicController.hardStop();
    }

    function handleBeforeUnload() {
      void backgroundMusicController.hardStop();
    }

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    document.addEventListener('visibilitychange', unlockAudio);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('visibilitychange', unlockAudio);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void backgroundMusicController.hardStop();
    };
  }, []);

  return null;
}
