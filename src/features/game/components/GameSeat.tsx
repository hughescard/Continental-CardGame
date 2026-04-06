import { memo } from 'react';
import { cn } from '@/shared/lib/cn';

interface GameSeatProps {
  displayName: string;
  cardCount: number;
  isCurrentTurn: boolean;
  hasGoneDown: boolean;
  isClaimPriority: boolean;
  isSelf?: boolean;
  compact?: boolean;
}

function GameSeatComponent({
  displayName,
  cardCount,
  isCurrentTurn,
  hasGoneDown,
  isClaimPriority,
  isSelf = false,
  compact = false,
}: GameSeatProps) {
  const backCardCount = Math.max(0, cardCount);
  const backCardClass = compact ? 'h-8 w-6 rounded-[0.65rem]' : 'h-10 w-7 rounded-[0.7rem]';
  const cardWidthRem = compact ? 1.5 : 1.75;
  const availableWidthRem = compact ? 5.2 : 7.2;
  const overlapStepRem =
    backCardCount === 1
      ? 0
      : Math.min(cardWidthRem * 0.55, (availableWidthRem - cardWidthRem) / (backCardCount - 1));

  return (
    <article
      className={cn(
        compact
          ? 'rounded-[1rem] border border-line/70 bg-black/20 px-3 py-2.5 backdrop-blur-sm'
          : 'rounded-[1.2rem] border border-line/70 bg-black/20 px-3 py-3 backdrop-blur-sm',
        isCurrentTurn && 'border-brand/60 bg-brand/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('truncate font-semibold text-ink', compact ? 'text-[13px]' : 'text-sm')}>
            {displayName}
            {isSelf ? ' · Tú' : ''}
          </p>
          <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-1.5' : 'mt-2')}>
            {isCurrentTurn ? (
              <span className="rounded-full bg-brand/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
                turno
              </span>
            ) : null}
            {hasGoneDown ? (
              <span className="rounded-full bg-gold/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold/90">
                abajo
              </span>
            ) : null}
            {isClaimPriority ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                prioridad
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            cartas
          </p>
          <p className={cn('mt-1 font-bold text-ink', compact ? 'text-sm' : 'text-base')}>
            {cardCount}
          </p>
        </div>
      </div>

      <div className={cn('flex items-end', compact ? 'mt-2' : 'mt-3')}>
        <div className={cn('relative w-full', compact ? 'h-9' : 'h-12')}>
          {Array.from({ length: backCardCount }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'absolute bottom-0 overflow-hidden border border-[#efe7d2]/80 bg-[#f6f0df] shadow-panel',
                backCardClass,
              )}
              style={{
                left: `${index * overlapStepRem}rem`,
                transform: `rotate(${(index - (backCardCount - 1) / 2) * 2.2}deg)`,
              }}
            >
              <span className="absolute inset-[0.16rem] rounded-[inherit] bg-[#0f4f57]" />
              <span className="absolute inset-[0.3rem] rounded-[calc(0.65rem-0.12rem)] border border-[#d8c48a]/55" />
              <span className="absolute inset-[0.42rem] rounded-[calc(0.65rem-0.2rem)] bg-[radial-gradient(circle,rgba(232,244,245,0.24)_1px,transparent_1.2px)] [background-size:5px_5px]" />
              <span className="absolute inset-[0.62rem] rounded-[0.18rem] border border-[#efe7d2]/80" />
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export const GameSeat = memo(GameSeatComponent);
