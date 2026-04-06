import { memo } from 'react';
import type { PublicTableMeld } from '@/application/models/game';
import { cn } from '@/shared/lib/cn';
import { describeCardCompact } from '@/features/game/lib/formatters';

interface GameMeldCardProps {
  meld: PublicTableMeld;
  ownerLabel: string;
  selected: boolean;
  onClick: () => void;
}

function GameMeldCardComponent({ meld, ownerLabel, selected, onClick }: GameMeldCardProps) {
  const meldLabel = meld.type === 'trio' ? 'Trío' : 'Escalera';

  return (
    <button
      className={cn(
        'w-full rounded-[1.8rem] border px-4 py-4 text-left transition-all active:scale-[0.99]',
        selected
          ? 'border-brand/70 bg-gradient-to-br from-brand/18 to-brand/8 ring-2 ring-brand/15'
          : 'border-line/70 bg-white/[0.04] hover:border-gold/30',
      )}
      onClick={onClick}
      type="button"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">
        {meldLabel}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">De {ownerLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {meld.cards.map((card) => (
          <span
            key={card.id}
            className="rounded-full border border-line/70 bg-surface px-3 py-2 text-xs font-semibold text-ink"
          >
            {describeCardCompact(card)}
          </span>
        ))}
      </div>
    </button>
  );
}

export const GameMeldCard = memo(GameMeldCardComponent);
