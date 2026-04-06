import { memo, type PropsWithChildren } from 'react';
import { cn } from '@/shared/lib/cn';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

interface GameNoticeProps extends PropsWithChildren {
  title: string;
  tone?: NoticeTone;
}

function toneClasses(tone: NoticeTone) {
  if (tone === 'success') {
    return 'border-emerald-300/35 bg-emerald-500/12 text-emerald-100';
  }

  if (tone === 'warning') {
    return 'border-amber-300/35 bg-amber-500/12 text-amber-100';
  }

  if (tone === 'danger') {
    return 'border-rose-300/35 bg-rose-500/12 text-rose-100';
  }

  return 'border-sky-300/35 bg-sky-500/12 text-sky-100';
}

function GameNoticeComponent({ title, children, tone = 'info' }: GameNoticeProps) {
  return (
    <article className={cn('rounded-[1.2rem] border px-3.5 py-3.5', toneClasses(tone))}>
      <p className="text-xs font-bold uppercase tracking-[0.18em]">{title}</p>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </article>
  );
}

export const GameNotice = memo(GameNoticeComponent);
