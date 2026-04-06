import { memo } from 'react';
import type { CardInstance } from '@/domain/types/cards';
import { cn } from '@/shared/lib/cn';
import { describeCardDetail, getSuitMeta } from '@/features/game/lib/formatters';

interface GameHandCardProps {
  card: CardInstance;
  selected: boolean;
  onClick: () => void;
}

function GameHandCardComponent({ card, selected, onClick }: GameHandCardProps) {
  const suitMeta = getSuitMeta(card.suit);
  const jokerSymbol = '🃏';
  const displayRank = card.rank === 'JOKER' ? '' : card.rank;
  const isRedSuit =
    card.suit === 'hearts' || card.suit === 'diamonds' || card.suit === 'joker';
  const accentClass =
    card.rank === 'JOKER'
      ? 'text-gold/95'
      : isRedSuit
        ? 'text-rose-600'
        : 'text-slate-900';
  return (
    <button
      className={cn(
        'relative min-h-[7.2rem] min-w-[4.6rem] snap-start overflow-hidden rounded-[1.25rem] border bg-[#fcfaf6] px-2 py-2 text-left transition-all active:scale-[0.98] md:min-w-[5rem]',
        selected
          ? 'z-10 scale-[1.02] border-brand shadow-[0_0_0_2px_rgba(25,183,164,0.25),0_12px_28px_-14px_rgba(25,183,164,0.65)]'
          : 'border-slate-300/90 shadow-panel hover:border-gold/45',
      )}
      onClick={onClick}
      type="button"
    >
      <span className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-white/0 via-white/0 to-slate-200/35" />
      <span
        className={cn(
          'pointer-events-none absolute inset-[3px] rounded-[1.05rem] border',
          selected ? 'border-brand/60' : 'border-slate-300/80',
        )}
      />
      {selected ? (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(25,183,164,0.08),transparent_32%,transparent_70%,rgba(25,183,164,0.12))]" />
          <span className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-brand/75" />
        </>
      ) : null}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className={cn('leading-none', accentClass)}>
            {card.rank === 'JOKER' ? null : (
              <>
                <p className="text-[1.25rem] font-black">{displayRank}</p>
                <p className="mt-0.5 text-[0.85rem] font-bold">{suitMeta.symbol}</p>
              </>
            )}
          </div>
          <span />
        </div>

        <div className="flex flex-1 items-center justify-center py-0.5">
          {card.rank === 'JOKER' ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[0.52rem] font-black uppercase tracking-[0.08em] text-slate-900">
                <span className="block leading-none">J</span>
                <span className="mt-0.5 block leading-none">O</span>
                <span className="mt-0.5 block leading-none">K</span>
                <span className="mt-0.5 block leading-none">E</span>
                <span className="mt-0.5 block leading-none">R</span>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-180 text-[0.52rem] font-black uppercase tracking-[0.08em] text-slate-900">
                <span className="block leading-none">J</span>
                <span className="mt-0.5 block leading-none">O</span>
                <span className="mt-0.5 block leading-none">K</span>
                <span className="mt-0.5 block leading-none">E</span>
                <span className="mt-0.5 block leading-none">R</span>
              </div>
              <span className="absolute left-3 top-2 text-[0.7rem] text-rose-600">♦</span>
              <span className="absolute right-3 top-3 text-[0.7rem] text-slate-900">♣</span>
              <span className="absolute left-4 bottom-3 text-[0.7rem] text-rose-600">♥</span>
              <span className="absolute right-4 bottom-2 text-[0.7rem] text-slate-900">♠</span>
              <p className="text-[2rem] leading-none">{jokerSymbol}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className={cn('text-[1.55rem] font-black leading-none', accentClass)}>
                {suitMeta.symbol}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <span />
          {card.rank === 'JOKER' ? null : (
            <div className={cn('rotate-180 text-right leading-none', accentClass)}>
              <p className="text-[1.05rem] font-black">{displayRank}</p>
              <p className="mt-0.5 text-[0.8rem] font-bold">{suitMeta.symbol}</p>
            </div>
          )}
        </div>
      </div>

      <span className="sr-only">
        {describeCardDetail(card)}
        {selected ? ', seleccionada' : ''}
      </span>
    </button>
  );
}

export const GameHandCard = memo(GameHandCardComponent);
