import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appServices } from '@/application/services/app-services';
import { useUiStore } from '@/store/ui/ui-store';
import { useSessionStore } from '@/store/session/session-store';
import { SectionCard } from '@/shared/ui/layout/SectionCard';

export function JoinPage() {
  const navigate = useNavigate();
  const pendingRoomCode = useUiStore((state) => state.pendingRoomCode);
  const setPendingRoomCode = useUiStore((state) => state.setPendingRoomCode);
  const preferredDisplayName = useSessionStore((state) => state.preferredDisplayName);
  const setPreferredDisplayName = useSessionStore(
    (state) => state.setPreferredDisplayName,
  );
  const setLastVisitedRoomId = useSessionStore((state) => state.setLastVisitedRoomId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await appServices.joinRoomByCode({
        roomCode: pendingRoomCode,
        displayName: preferredDisplayName,
      });

      setLastVisitedRoomId(result.roomId);
      navigate(`/room/${result.roomId}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo unir a la sala.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard
      eyebrow="Entrar a la mesa"
      title="Únete a una partida en segundos"
      description="Escribe tu nombre, pega el código y entra directo al lobby en tiempo real."
    >
      <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_0.9fr]">
        <form
          className="min-w-0 rounded-[2rem] border border-line/70 bg-white/[0.04] p-5 shadow-glow"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold/80">
              Código privado
            </p>
            <h2 className="text-2xl font-bold text-ink">Entrar con amigos</h2>
            <p className="text-sm leading-6 text-muted">
              Usa el código que compartió el host y entra con tu nombre visible.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Nombre visible</span>
              <input
                autoComplete="nickname"
                className="w-full rounded-[1.35rem] border border-line/80 bg-surface px-4 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
                maxLength={24}
                onChange={(event) => setPreferredDisplayName(event.target.value)}
                placeholder="Ej: Ana"
                value={preferredDisplayName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Código de sala</span>
              <input
                autoComplete="off"
                className="w-full rounded-[1.35rem] border border-line/80 bg-surface px-4 py-3.5 text-base uppercase tracking-[0.24em] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
                maxLength={8}
                onChange={(event) => setPendingRoomCode(event.target.value)}
                placeholder="Ej: AB12CD"
                value={pendingRoomCode}
              />
            </label>
            <button
              className="w-full rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar a la sala'}
            </button>
            {error ? (
              <div className="rounded-[1.35rem] border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </div>
        </form>

        <div className="game-hero min-w-0 rounded-[2rem] border border-line/70 p-5 shadow-glow">
          <h2 className="text-base font-semibold text-ink">Cómo funciona</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            <li className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
              El código te lleva directo a la sala compartida.
            </li>
            <li className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
              Tu sesión se conserva automáticamente para seguir jugando.
            </li>
            <li className="rounded-[1.35rem] border border-line/70 bg-white/[0.05] px-4 py-3">
              Verás el lobby en tiempo real y entrarás a la partida sin recargar.
            </li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
