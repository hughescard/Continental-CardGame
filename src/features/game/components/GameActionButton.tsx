import { memo } from 'react';
import { cn } from '@/shared/lib/cn';

type ActionTone = 'brand' | 'surface' | 'danger';

interface GameActionButtonProps {
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string | undefined;
  onClick: () => void;
  tone?: ActionTone | undefined;
}

function getToneClass(tone: ActionTone) {
  if (tone === 'brand') {
    return 'border-brand/60 bg-gradient-to-br from-brand to-brand-strong text-white shadow-glow';
  }

  if (tone === 'danger') {
    return 'border-rose-300/40 bg-rose-500/12 text-rose-100';
  }

  return 'border-line/70 bg-white/[0.05] text-ink';
}

function GameActionButtonComponent({
  label,
  disabled = false,
  onClick,
  tone = 'surface',
}: GameActionButtonProps) {
  return (
    <button
      className={cn(
        'flex min-h-[2.8rem] w-full items-center rounded-[0.95rem] border px-2.5 py-2 text-left transition-transform active:scale-[0.99]',
        getToneClass(tone),
        disabled && 'cursor-not-allowed opacity-55',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <p className="w-full text-center text-[13px] font-semibold">{label}</p>
    </button>
  );
}

export const GameActionButton = memo(GameActionButtonComponent);
