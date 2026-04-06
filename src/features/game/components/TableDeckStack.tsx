import type { CardInstance } from '@/domain/types/cards';
import { cn } from '@/shared/lib/cn';
import { getSuitMeta } from '@/features/game/lib/formatters';

interface TableDeckStackProps {
  label: string;
  card?: CardInstance | null;
  accent?: 'deck' | 'discard';
  active?: boolean;
  onClick?: (() => void) | undefined;
  children?: React.ReactNode;
}

function CardBackFace() {
  return (
    <span className="absolute left-0 top-0 block h-[4.6rem] w-[3.35rem] overflow-hidden rounded-[1rem] border border-[#efe7d2]/85 bg-[#f6f0df] shadow-panel">
      <span className="absolute inset-[0.24rem] rounded-[0.8rem] bg-[#0f4f57]" />
      <span className="absolute inset-[0.42rem] rounded-[0.66rem] border border-[#d8c48a]/55" />
      <span className="absolute inset-[0.58rem] rounded-[0.52rem] bg-[radial-gradient(circle,rgba(232,244,245,0.24)_1px,transparent_1.2px)] [background-size:6px_6px]" />
      <span className="absolute inset-[0.82rem] rounded-[0.32rem] border border-[#efe7d2]/80" />
      <span className="absolute inset-[0.97rem] rounded-[0.2rem] bg-[radial-gradient(circle,rgba(232,244,245,0.18)_1px,transparent_1.2px)] [background-size:4px_4px]" />
    </span>
  );
}

function DiscardCardFace({ card }: { card: CardInstance }) {
  const suitMeta = getSuitMeta(card.suit);
  const isJoker = card.rank === 'JOKER';
  const accentClass =
    card.suit === 'hearts' || card.suit === 'diamonds' || card.suit === 'joker'
      ? 'text-rose-600'
      : 'text-slate-900';

  return (
    <span className="absolute left-0 top-0 block h-[4.6rem] w-[3.35rem] overflow-hidden rounded-[1rem] border border-slate-300/90 bg-[#fcfaf6] shadow-panel">
      <span className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-slate-200/35" />
      <span className="absolute inset-[3px] rounded-[0.82rem] border border-slate-300/80" />
      <span className="relative z-10 block h-full w-full">
        {!isJoker ? (
          <>
            <span className={cn('absolute left-1.5 top-1.5 leading-none', accentClass)}>
              <span className="block text-[0.8rem] font-black leading-none">{card.rank}</span>
              <span className="mt-0.5 block text-[0.52rem] font-bold leading-none">
                {suitMeta.symbol}
              </span>
            </span>
            <span className={cn('absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[1.15rem] font-black leading-none', accentClass)}>
              {suitMeta.symbol}
            </span>
            <span className={cn('absolute bottom-1.5 right-1.5 rotate-180 text-right leading-none', accentClass)}>
              <span className="block text-[0.72rem] font-black leading-none">{card.rank}</span>
              <span className="mt-0.5 block text-[0.48rem] font-bold leading-none">
                {suitMeta.symbol}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[0.32rem] font-black uppercase tracking-[0.03em] text-slate-900">
              <span className="block leading-none">J</span>
              <span className="mt-[1px] block leading-none">O</span>
              <span className="mt-[1px] block leading-none">K</span>
              <span className="mt-[1px] block leading-none">E</span>
              <span className="mt-[1px] block leading-none">R</span>
            </span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 rotate-180 text-[0.32rem] font-black uppercase tracking-[0.03em] text-slate-900">
              <span className="block leading-none">J</span>
              <span className="mt-[1px] block leading-none">O</span>
              <span className="mt-[1px] block leading-none">K</span>
              <span className="mt-[1px] block leading-none">E</span>
              <span className="mt-[1px] block leading-none">R</span>
            </span>
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[1.05rem] leading-none">
              🃏
            </span>
          </>
        )}
      </span>
    </span>
  );
}

export function TableDeckStack({
  label,
  card = null,
  accent = 'deck',
  active = false,
  onClick,
  children,
}: TableDeckStackProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'relative rounded-[1.4rem] border p-3.5 text-left transition-all',
        accent === 'deck'
          ? 'border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-surface-alt'
          : 'border-gold/25 bg-gradient-to-br from-gold/10 via-surface to-surface-alt',
        onClick && 'active:scale-[0.99]',
        active && 'shadow-glow ring-2 ring-brand/20',
      )}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-center">
        <div className="relative h-[4.6rem] w-[3.35rem] shrink-0">
          {accent === 'discard' && card ? (
            <DiscardCardFace card={card} />
          ) : (
            <span className="absolute left-0 top-0 block h-[4.6rem] w-[3.35rem]">
              {accent === 'deck' ? (
                <CardBackFace />
              ) : (
                <span
                  className={cn(
                    'absolute left-0 top-0 flex h-[4.6rem] w-[3.35rem] items-center justify-center rounded-[1rem] border text-lg font-black',
                    'border-slate-300/70 bg-[#fcfaf6] text-slate-900',
                  )}
                >
                  {children ?? 'A♠'}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </Component>
  );
}
