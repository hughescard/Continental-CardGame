import { Link } from 'react-router-dom';

export function BrandMark() {
  return (
    <Link className="inline-flex items-center gap-3" to="/">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-[1.15rem] border border-gold/35 bg-white/[0.06] text-sm font-extrabold uppercase tracking-[0.24em] text-white shadow-panel">
        <span className="absolute inset-[3px] rounded-[0.95rem] bg-gradient-to-br from-brand/80 via-brand-strong/90 to-surface" />
        <span className="relative">C</span>
      </div>
      <div className="space-y-0.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold/85">
          Continental Card Game
        </div>
        <div className="text-[11px] font-medium tracking-[0.18em] text-muted">
          By Guille Hughes
        </div>
      </div>
    </Link>
  );
}
