import { useState, type PropsWithChildren } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navigationItems } from '@/shared/constants/navigation';
import { cn } from '@/shared/lib/cn';
import { MusicToggleButton } from '@/shared/ui/audio/MusicToggleButton';
import { BrandMark } from '@/shared/ui/brand/BrandMark';

export function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith('/game/');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip">
      {isGameRoute ? null : (
        <header className="sticky top-0 z-20 border-b border-line/50 bg-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-start px-4 py-4 sm:px-6 lg:px-8">
            <BrandMark />
          </div>
        </header>
      )}

      {!isGameRoute ? (
        <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-5">
          {isMenuOpen ? (
            <button
              aria-label="Cerrar menú"
              className="fixed inset-0 z-0 bg-black/25"
              onClick={() => setIsMenuOpen(false)}
              type="button"
            />
          ) : null}
          <div className="relative">
            <button
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line/80 bg-surface/92 text-ink shadow-glow backdrop-blur-xl transition-colors hover:border-brand/50 hover:text-white"
              onClick={() => setIsMenuOpen((current) => !current)}
              type="button"
            >
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.25"
                  />
                ) : (
                  <>
                    <path
                      d="M5 7H19"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.25"
                    />
                    <path
                      d="M5 12H19"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.25"
                    />
                    <path
                      d="M5 17H19"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.25"
                    />
                  </>
                )}
              </svg>
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 z-10 mt-3 flex w-[15rem] flex-col gap-2 rounded-[1.35rem] border border-line/70 bg-surface/96 p-3 shadow-glow backdrop-blur-xl">
                <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold/80">
                  Menú
                </p>
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex h-11 items-center justify-between rounded-full border px-4 text-sm font-semibold transition-colors',
                        isActive
                          ? 'border-brand bg-brand text-white shadow-glow'
                          : 'border-line/80 bg-white/[0.05] text-ink hover:border-brand/50 hover:text-white',
                      )
                    }
                    onClick={() => setIsMenuOpen(false)}
                    to={item.href}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="text-base leading-none">
                      ↗
                    </span>
                  </NavLink>
                ))}
                <MusicToggleButton className="w-full justify-between px-4" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
