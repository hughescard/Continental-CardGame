import type { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="game-panel min-w-0 overflow-hidden rounded-[1.75rem] border border-line/70 shadow-glow sm:rounded-[2rem]">
      <div className="flex flex-col gap-4 border-b border-line/70 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl space-y-2">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted">{description}</p>
            </div>
          </div>
          {action ? <div className="max-w-full sm:shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}
