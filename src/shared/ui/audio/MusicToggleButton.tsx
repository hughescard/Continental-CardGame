import { backgroundMusicController } from '@/shared/audio/background-music';
import { useUiStore } from '@/store/ui/ui-store';
import { cn } from '@/shared/lib/cn';

interface MusicToggleButtonProps {
  compact?: boolean;
  className?: string;
}

export function MusicToggleButton({
  compact = false,
  className,
}: MusicToggleButtonProps) {
  const musicEnabled = useUiStore((state) => state.musicEnabled);
  const setMusicEnabled = useUiStore((state) => state.setMusicEnabled);

  async function handleClick() {
    const nextValue = !musicEnabled;
    setMusicEnabled(nextValue);

    if (nextValue) {
      try {
        await backgroundMusicController.primeAndResume();
      } catch {
        // Silencioso: si el navegador bloquea audio, el manager reintentará en la próxima interacción.
      }
    }
  }

  return (
    <button
      aria-label={musicEnabled ? 'Desactivar música' : 'Activar música'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-line/80 bg-white/[0.05] text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:text-white',
        compact ? 'h-11 min-w-[3.25rem] px-3' : 'h-11 px-4',
        className,
      )}
      onClick={() => void handleClick()}
      type="button"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {musicEnabled ? '♪' : '×'}
      </span>
      {compact ? null : <span>Música</span>}
    </button>
  );
}
