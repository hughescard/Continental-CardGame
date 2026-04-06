import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appServices } from '@/application/services/app-services';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { SectionCard } from '@/shared/ui/layout/SectionCard';
import { useSessionStore } from '@/store/session/session-store';

const socialHighlights = [
  'Partidas privadas con código corto',
  'Juego en tiempo real con manos separadas',
  'Ocho rondas completas con scoring real',
];

export function HomePage() {
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const preferredDisplayName = useSessionStore((state) => state.preferredDisplayName);
  const lastVisitedRoomId = useSessionStore((state) => state.lastVisitedRoomId);
  const setPreferredDisplayName = useSessionStore(
    (state) => state.setPreferredDisplayName,
  );
  const setLastVisitedRoomId = useSessionStore((state) => state.setLastVisitedRoomId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await appServices.createRoom({
        displayName: preferredDisplayName,
      });

      setLastVisitedRoomId(result.room.id);
      navigate(`/room/${result.room.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo crear la sala.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <SectionCard
        eyebrow="Juego social"
        title="Abre la mesa y juega Continental con tus amigos"
        description="Una experiencia pensada para móvil, con partidas privadas, turnos en tiempo real y mesa compartida como protagonista."
        action={
          lastVisitedRoomId ? (
            <button
              className="rounded-full border border-brand/50 bg-brand/12 px-5 py-3 text-sm font-semibold text-brand transition-colors hover:border-brand hover:bg-brand/18"
              onClick={() => navigate(`/room/${lastVisitedRoomId}`)}
              type="button"
            >
              Reanudar mesa
            </button>
          ) : null
        }
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="game-hero min-w-0 overflow-hidden rounded-[1.75rem] border border-line/70 px-4 py-5 shadow-glow">
            <div className="flex flex-wrap gap-2">
              {socialHighlights.map((highlight) => (
                <span key={highlight} className="game-chip">
                  {highlight}
                </span>
              ))}
            </div>

            <div className="mt-5 max-w-xl space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Cartas, descarte visible y tensión real de mesa.
              </h2>
              <p className="text-sm leading-6 text-muted">
                Crea una partida en segundos o entra con código. Todo está diseñado para jugar desde el teléfono sin perder claridad ni ritmo.
              </p>
            </div>

            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0 rounded-[1.5rem] border border-brand/20 bg-white/[0.05] p-3.5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                  Vista de mesa
                </p>
                <div className="mt-4 flex items-end justify-center gap-2">
                  {[
                    { label: 'Q♠', colorClass: 'text-slate-900' },
                    { label: 'Q♥', colorClass: 'text-rose-600' },
                    { label: 'Q♦', colorClass: 'text-rose-600' },
                  ].map((card, index) => (
                    <div
                      key={card.label}
                      className={`game-card-glow flex h-24 w-12 items-center justify-center rounded-[1.1rem] border border-line/80 bg-white text-center text-lg font-black shadow-panel ${card.colorClass} ${
                        index === 1 ? 'mb-3' : ''
                      }`}
                    >
                      {card.label}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-gold/25 bg-gold/10 px-3.5 py-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80">
                    Ritmo de partida
                  </p>
                  <p className="mt-2 text-sm leading-5 text-gold/95">
                    Descarte visible, combinaciones compartidas y ocho rondas seguidas sin perder claridad.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 gap-3">
                <div className="rounded-[1.35rem] border border-line/80 bg-white/[0.04] p-3.5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    Sesión
                  </p>
                  <p className="mt-2 text-base font-bold text-ink">
                    {session.userId ? 'Lista para jugar' : 'Se crea al entrar'}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-line/80 bg-white/[0.04] p-3.5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    Partidas
                  </p>
                  <p className="mt-2 text-base font-bold text-ink">2 a 7 jugadores</p>
                </div>
              </div>
            </div>
          </div>

          <form
            className="min-w-0 rounded-[1.75rem] border border-line/70 bg-white/[0.04] p-4 shadow-glow"
            onSubmit={handleCreateRoom}
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Crear partida
            </p>
            <div className="mt-3 space-y-3.5">
              <div>
                <h2 className="text-xl font-bold text-ink">Tu mesa empieza aquí</h2>
                <p className="mt-2 text-sm leading-5 text-muted">
                  Elige el nombre con el que te verán en la partida y crea una sala privada al instante.
                </p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Nombre visible
                </span>
                <input
                  className="w-full rounded-[1.1rem] border border-line/80 bg-surface px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
                  maxLength={24}
                  onChange={(event) => setPreferredDisplayName(event.target.value)}
                  placeholder="Ej: Ana"
                  value={preferredDisplayName}
                />
              </label>
              <button
                className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Abriendo mesa...' : 'Crear partida'}
              </button>
              <div className="rounded-[1.1rem] border border-line/70 bg-surface px-4 py-3 text-sm leading-5 text-muted">
                {session.userId
                  ? 'Tu sesión ya está lista para empezar.'
                  : 'La sesión anónima se preparará automáticamente al entrar.'}
              </div>
              {error ? (
                <div className="rounded-[1.1rem] border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
